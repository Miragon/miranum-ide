import type { ClipboardOptions, ModelerCapabilities, ModelerMode } from "@miragon/bpmn-modeler";
import type { SurfaceFactories } from "@miragon/bpmn-modeler/mode";
import { LogWarningCommand } from "@miragon/bpmn-modeler-shared";

import type { HostModelerState } from "../hostModelerState";
import { loadDesignerModule, loadModelerModule, loadViewerModule } from "../surfaceModules";
import type { HostChannel } from "./hostChannel";
import type { LintBridge } from "./lintBridge";

interface SurfaceFactoryPorts {
    propertiesPanelParent: HTMLElement;
    capabilities: ModelerCapabilities;
    extraModules: unknown[];
    clipboard: ClipboardOptions | undefined;
    lintBridge: Pick<LintBridge, "surfaceOptions">;
    hostModelerState: Pick<
        HostModelerState,
        "settings" | "applySettingsPushedSince" | "applyFavouritesPushedSince"
    >;
    reportElementTemplateErrors(errors: readonly unknown[] | undefined): void;
    onModelerModeChanged(mode: ModelerMode): void;
}

/**
 * The three surface factories the mode session switches between. View →
 * readonly viewer; Design on an untagged model → the engine-neutral designer;
 * Design/Implement on a tagged model → one createModeler whose `mode` toggles
 * live. Every surface is born in the IDE's forced theme so the first frame
 * paints correctly (the body class is the IDE signal, not "automatic"). Both
 * editable surfaces share the lint bridge's options; the designer resolves the
 * engine-neutral Design config, the modeler re-resolves per mode on a live
 * toggle.
 */
export function createSurfaceFactories(
    host: HostChannel,
    ports: SurfaceFactoryPorts,
): SurfaceFactories {
    const { capabilities, extraModules, hostModelerState, propertiesPanelParent } = ports;

    return {
        view: async ({ container, theme }) => {
            const { createViewer } = await loadViewerModule();
            return createViewer(container, {
                theme,
                propertiesPanel: { parent: propertiesPanelParent },
                capabilities: { modelNavigation: capabilities.modelNavigation },
                additionalModules: extraModules,
            });
        },
        design: async ({ container, theme }) => {
            const [{ createDesigner }, linting] = await Promise.all([
                loadDesignerModule(),
                ports.lintBridge.surfaceOptions(),
            ]);
            const settingsAtCreation = hostModelerState.settings;
            const designer = await createDesigner(container, {
                theme,
                favouriteBpmnElements: settingsAtCreation?.favouriteBpmnElements,
                propertiesPanel: { parent: propertiesPanelParent },
                clipboard: ports.clipboard,
                capabilities: {
                    modelNavigation: capabilities.modelNavigation,
                    definitionSearch: capabilities.definitionSearch,
                },
                additionalModules: extraModules,
                ...linting,
            });
            // A push during the async init only reached the previous surface.
            hostModelerState.applyFavouritesPushedSince(settingsAtCreation, designer);
            return designer;
        },
        implement: async ({ container, theme, mode, engine }) => {
            if (engine === undefined) {
                // The session only routes Implement (and tagged-model Design)
                // here, so this is unreachable — throw rather than lie to
                // createModeler's `engine: Engine`.
                throw new Error("implement surface requires a tagged model");
            }
            const [{ createModeler }, linting] = await Promise.all([
                loadModelerModule(),
                ports.lintBridge.surfaceOptions(),
            ]);
            const settingsAtCreation = hostModelerState.settings;
            const modeler = await createModeler(container, {
                engine,
                mode,
                theme,
                settings: settingsAtCreation,
                propertiesPanel: { parent: propertiesPanelParent },
                additionalModules: extraModules,
                clipboard: ports.clipboard,
                capabilities,
                ...linting,
                onWarning: (warning: string) => host.postMessage(new LogWarningCommand(warning)),
                onElementTemplatesErrors: ports.reportElementTemplateErrors,
                // The modeler's own toggle notification. The session also
                // fires onModeChanged("toggle"); both write the same values, so
                // keeping this (the session cannot inject into the options bag)
                // is a harmless redundancy, not a second source of truth.
                onModeChanged: ports.onModelerModeChanged,
                handleGlobalEscape: true,
            });
            // A push during the async init only reached the previous surface.
            hostModelerState.applySettingsPushedSince(settingsAtCreation, modeler);
            return modeler;
        },
    };
}
