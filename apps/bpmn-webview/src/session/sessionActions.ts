import { i18n, type SupportedLocale } from "@miragon/bpmn-modeler-i18n";
import {
    type FocusElementQuery,
    type InertLock,
    type LanguageQuery,
    LogErrorCommand,
} from "@miragon/bpmn-modeler-shared";

import type { WebviewStateManager } from "../state";
import type { SurfaceHandle } from "../surface";
import type { BpmnDocumentSync } from "./documentSync";
import type { HostChannel } from "./hostChannel";

type SessionDocument = Pick<
    BpmnDocumentSync,
    | "isReady"
    | "hasPendingHostUpdate"
    | "flushHostUpdates"
    | "flushOutbound"
    | "enqueueModelerOperation"
    | "cancelAll"
>;

type SessionViewState = Pick<
    WebviewStateManager,
    "captureViewState" | "applyViewState" | "flushViewport"
>;

interface SessionActionPorts {
    documentSync: SessionDocument;
    /** `undefined` until the surface is bound after its first import. */
    getViewState(): SessionViewState | undefined;
    reloadLock: InertLock;
    cancelPendingVariablePublish(): void;
    reloadPage(): void;
}

interface SessionActionHandlers {
    LanguageQuery(query: LanguageQuery): Promise<void>;
    FocusElementQuery(query: FocusElementQuery): Promise<void>;
}

export interface SessionActions {
    readonly handlers: SessionActionHandlers;
    isReloading(): boolean;
    reloadForEngineChange(): Promise<void>;
    drainPendingActions(): Promise<void>;
}

export function createSessionActions(
    host: HostChannel,
    getSurface: () => SurfaceHandle,
    ports: SessionActionPorts,
): SessionActions {
    const { documentSync } = ports;
    let engineReloadPending = false;
    let pendingDrain: Promise<void> | undefined;
    let refreshDiagramWhenReady = false;
    // A FocusElementQuery can arrive before the import finishes (host opens the
    // editor and focuses in one tick); apply it once the modeler is ready.
    let pendingFocusId: string | undefined;

    async function reloadForEngineChange(): Promise<void> {
        if (engineReloadPending) return;
        engineReloadPending = true;
        documentSync.cancelAll();
        ports.cancelPendingVariablePublish();
        refreshDiagramWhenReady = false;
        pendingFocusId = undefined;
        ports.reloadLock.acquire();

        await documentSync.enqueueModelerOperation(async () => {
            try {
                documentSync.cancelAll();
                await documentSync.flushOutbound();
                ports.getViewState()?.flushViewport();
            } finally {
                try {
                    getSurface().destroy();
                } finally {
                    ports.reloadPage();
                }
            }
        });
    }

    function drainPendingActions(): Promise<void> {
        if (!pendingDrain) {
            pendingDrain = (async () => {
                while (!engineReloadPending) {
                    await documentSync.flushHostUpdates();
                    if (engineReloadPending) return;

                    if (refreshDiagramWhenReady) {
                        refreshDiagramWhenReady = false;
                        try {
                            await documentSync.enqueueModelerOperation(refreshDiagram);
                        } catch (error) {
                            const cause = error instanceof Error ? error : new Error(String(error));
                            host.postMessage(
                                new LogErrorCommand(
                                    `Unable to refresh diagram\n${cause.message}`,
                                    cause.stack,
                                ),
                            );
                        }
                        if (engineReloadPending) return;
                        continue;
                    }

                    if (documentSync.hasPendingHostUpdate()) {
                        continue;
                    }

                    if (pendingFocusId !== undefined) {
                        getSurface().viewport.centerOnElement(pendingFocusId);
                        pendingFocusId = undefined;
                    }
                    return;
                }
            })().finally(() => {
                pendingDrain = undefined;
            });
        }
        return pendingDrain;
    }

    async function refreshDiagram(): Promise<void> {
        const xml = await getSurface().exportDiagram();
        const snapshot = ports.getViewState()?.captureViewState();
        try {
            await getSurface().loadDiagram(xml);
        } finally {
            // The re-import has already reset the plane, so restore even on a late throw.
            if (snapshot) {
                ports.getViewState()?.applyViewState(snapshot);
            }
        }
    }

    async function applyHostLanguage(query: LanguageQuery): Promise<void> {
        // The translator's onChange subscribers follow on their own, but bpmn-js
        // needs a re-import to re-translate already-rendered elements. The host
        // pushes the language on every (re)load, not only on change, so compare
        // resolved locales (setLanguage falls back to "en" for unknown codes):
        // a tab re-show must not re-import.
        const localeBefore = i18n.getLocale();
        i18n.setLanguage(query.locale as SupportedLocale);
        if (i18n.getLocale() !== localeBefore) {
            refreshDiagramWhenReady = true;
            if (documentSync.isReady()) {
                await drainPendingActions();
            }
        }
    }

    async function focusElementWhenReady({ elementId }: FocusElementQuery): Promise<void> {
        pendingFocusId = elementId;
        if (documentSync.isReady()) {
            await drainPendingActions();
        }
    }

    return {
        handlers: {
            LanguageQuery: applyHostLanguage,
            FocusElementQuery: focusElementWhenReady,
        },
        isReloading: () => engineReloadPending,
        reloadForEngineChange,
        drainPendingActions,
    };
}
