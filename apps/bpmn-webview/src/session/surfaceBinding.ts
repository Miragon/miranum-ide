import type { ModelerCapabilities } from "@miragon/bpmn-modeler";
import { LAYOUT_FORMATTED_EVENT, type LayoutOutcome } from "@miragon/bpmn-modeler-layout";
import {
    type Command,
    DiagramFormattedCommand,
    type ElementTemplatesQuery,
    GetBpmnlintConfigCommand,
    GetElementTemplatesCommand,
    type HostApi,
    type Query,
} from "@miragon/bpmn-modeler-shared";
import type { DetectedEngine } from "@miragon/bpmn-modeler-types";

import { WebviewStateManager } from "../state";
import {
    isEditableHandle,
    isFormattableHandle,
    isLintingHandle,
    isModelerHandle,
    type SurfaceHandle,
} from "../surface";
import type { WebviewState } from "../webviewState";
import type { BpmnDocumentSync } from "./documentSync";
import { createProcessVariablePublisher } from "./processVariablePublisher";

export interface SurfaceBinding {
    readonly stateManager: WebviewStateManager;
    /** The subscriptions die with the instance; this drops the work they already scheduled. */
    dispose(): void;
}

export interface SurfaceBinder {
    bindSurface(handle: SurfaceHandle): SurfaceBinding;
    requestSurfaceResources(handle: SurfaceHandle): void;
}

interface SurfaceBinderPorts {
    documentSync: Pick<BpmnDocumentSync, "scheduleSync">;
    lifecycle: { isReloading(): boolean };
    panelRoot: HTMLElement;
    engine: DetectedEngine;
    capabilities: Pick<ModelerCapabilities, "scripting">;
    elementTemplatesReply: { done(reply: ElementTemplatesQuery | undefined): void };
}

/**
 * Rebinds the per-surface subscriptions on every (re)creation: outbound sync,
 * the C7 variable publisher, and the state manager. All of these live on the
 * instance and die with it, so a mode switch that forgot to rebind would
 * silently stop syncing/persisting.
 */
export function createSurfaceBinder(
    host: HostApi<WebviewState, Command | Query>,
    ports: SurfaceBinderPorts,
): SurfaceBinder {
    function bindSurface(handle: SurfaceHandle): SurfaceBinding {
        // Outbound sync: the modeler exposes onCommandStackChanged; the
        // designer emits via the shared eventBus; the readonly viewer never
        // schedules a sync (so respondToFlush sees nothing pending in View).
        if (isModelerHandle(handle)) {
            handle.onCommandStackChanged(() => ports.documentSync.scheduleSync());
        } else if (isEditableHandle(handle)) {
            handle
                .getService<{ on(event: string, cb: () => void): void }>("eventBus")
                .on("commandStack.changed", () => ports.documentSync.scheduleSync());
        }

        // One report path for both triggers: the canvas shortcut and the
        // host command both end in `Layouter.format`, which announces every
        // outcome here rather than returning it to two different callers.
        if (isFormattableHandle(handle)) {
            handle
                .getService<{
                    on(event: string, cb: (outcome: LayoutOutcome) => void): void;
                }>("eventBus")
                .on(LAYOUT_FORMATTED_EVENT, (outcome) => {
                    host.postMessage(
                        new DiagramFormattedCommand(
                            outcome.status,
                            outcome.diagnostics,
                            outcome.code,
                            outcome.message,
                        ),
                    );
                });
        }

        let cancelPendingVariablePublish = (): void => {};
        // C7 process-variable publisher — modeler-only (scripting is a C7
        // cluster). Gated on the engine and the port being present, like the
        // capability that owns it.
        if (isModelerHandle(handle) && ports.engine === "c7" && ports.capabilities.scripting) {
            const variables = createProcessVariablePublisher(host, handle, ports.lifecycle);
            cancelPendingVariablePublish = variables.cancel;
            handle.onCommandStackChanged(variables.schedule);
            // commandStack.changed doesn't fire on import, and a webview
            // reload starts with an empty host-side store, so seed it.
            variables.schedule();
        }

        return {
            stateManager: new WebviewStateManager(host, handle, ports.panelRoot),
            dispose: () => cancelPendingVariablePublish(),
        };
    }

    // Element templates are modeler-only; a viewer/designer never receives
    // them, so its ElementTemplatesQuery would never arrive and the restore
    // chain's Promise.all would stall — resolve the templates gate immediately
    // instead. The lint config request goes to any editable (linting) surface:
    // the designer lints too, and the host answers an untagged doc
    // with the engine-less default the webview builds.
    function requestSurfaceResources(handle: SurfaceHandle): void {
        if (isModelerHandle(handle)) {
            host.postMessage(new GetElementTemplatesCommand());
        } else {
            ports.elementTemplatesReply.done(undefined);
        }
        if (isLintingHandle(handle)) {
            host.postMessage(new GetBpmnlintConfigCommand());
        }
    }

    return { bindSurface, requestSurfaceResources };
}
