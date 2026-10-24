// bpmn.js
import type { ImportXMLResult } from "bpmn-js/lib/BaseViewer";

import {
    BpmnFileQuery,
    BpmnModelerSettingQuery,
    Command,
    ElementTemplatesQuery,
    FocusElementQuery,
    GetBpmnFileCommand,
    GetBpmnlintConfigCommand,
    GetBpmnModelerSettingCommand,
    GetElementTemplatesCommand,
    GetPropertiesPanelStateCommand,
    LanguageQuery,
    DiagramFormattedCommand,
    LogErrorCommand,
    LogWarningCommand,
    PropertiesPanelStateQuery,
    Query,
    RequestFocusCommand,
    SetPropertiesPanelStateCommand,
    SyncDocumentCommand,
    UpdateScriptVariablesCommand,
    HOST_REPLY_TIMEOUT_MS,
    HostDocumentRevisions,
    createFlushResponder,
    createInertLockGroup,
    createResolver,
    extractProcessVariables,
    initResizer,
    installCanvasAutoFocus,
    installGlobalErrorForwarding,
    installPanelShortcuts,
    readSavedPanelVisibility,
    takeFocus,
} from "@miragon/bpmn-modeler-shared";
import {
    NoModelerError,
    UnsupportedEngineError,
    asyncDebounce,
    formatErrors,
    serializeAsync,
    type DetectedEngine,
    type SurfaceMode,
} from "@miragon/bpmn-modeler-types";
import {
    SURFACE_MODES,
    createModeSession,
    mountModeStrip,
    type ModeSession,
    type ModeStrip,
    type SurfaceFactories,
} from "@miragon/bpmn-modeler/mode";
import {
    applyPageThemeScope,
    createHostThemeAdapter,
    resolveHostThemeKind,
} from "@miragon/bpmn-modeler-shared";
import { i18n, type SupportedLocale } from "@miragon/bpmn-modeler-i18n";
import { extras as i18nExtras } from "@miragon/bpmn-modeler-i18n-extras";
import type {
    ClipboardOptions,
    LintingOptions,
    ModelerCapabilities,
    ModelerMode,
} from "@miragon/bpmn-modeler";
import type { HostApi } from "@miragon/bpmn-modeler-shared";
import type { LintRunEvent } from "@miragon/bpmn-modeler-types";
import { LAYOUT_FORMATTED_EVENT } from "@miragon/bpmn-modeler-layout";
import type { LayoutOutcome } from "@miragon/bpmn-modeler-layout";
import type { WebviewState } from "./webviewState";
import { installHostEditorActions } from "./hostEditorActions";
import { HostModelerState } from "./hostModelerState";
import { createLintBridge } from "./session/lintBridge";
import {
    createHostMessageRouter,
    createSessionMessageRouter,
    type DiffPaneHostMessages,
    type HostMessage,
    type HostMessageRoute,
} from "./session/messageRouter";
import { createProtocolCapabilities } from "./session/protocolCapabilities";
import { resolveClipboard } from "./session/protocolClipboard";
import { createSurfaceRequests } from "./session/surfaceRequests";
import { readSavedMode, WebviewStateManager } from "./state";
import {
    loadDesignerModule,
    loadModelerModule,
    loadViewerModule,
    prefetchSurfaceModules,
} from "./surfaceModules";
import {
    isEditableHandle,
    isFormattableHandle,
    isLintingHandle,
    isModelerHandle,
    type SurfaceHandle,
} from "./surface";
import "../../../packages/bpmn-modeler/src/styles/mode.css";

/**
 * Starts the BPMN webview against the given host. The entry chooses the host,
 * any host-specific bpmn-js modules, and — optionally — the per-feature
 * {@link ModelerCapabilities}. Omitting `capabilities` selects the
 * full protocol adapter, so every real host keeps all features; passing a
 * partial object turns off the features whose ports it omits.
 */
export function bootstrap(
    injectedHost: HostApi<WebviewState, Command | Query>,
    opts: {
        extraModules?: unknown[];
        capabilities?: ModelerCapabilities;
        linting?: LintingOptions;
        clipboard?: ClipboardOptions | "native";
        onLintResults?: (event: LintRunEvent) => void;
        reload?: () => void;
    } = {},
): void {
    startSession(
        injectedHost,
        opts.extraModules,
        opts.capabilities,
        opts.linting,
        opts.clipboard,
        opts.onLintResults,
        opts.reload,
    );
}

/**
 * One webview session. The modeler, resolvers, debounced syncs, flush
 * responder, and the "is initialized" latch are scoped to this closure so a
 * session owns its own lifetime rather than a page-wide singleton — the
 * prerequisite for hosting more than one modeler on a page. Single-instance
 * hosts (VS Code, IntelliJ, Theia) call {@link bootstrap} exactly once.
 *
 * @param host The injected host adapter.
 * @param injectedModules Host-specific extra bpmn-js DI modules.
 * @param injectedCapabilities Explicit per-feature ports; `undefined` selects
 *   the full protocol adapter so every real host keeps all features.
 * @param injectedLinting The bpmnlint tier; `undefined` selects the external
 *   (host-pushed) tier that real hosts use.
 * @param injectedClipboard The clipboard tier; `undefined` selects dev-build
 *   native, otherwise the protocol bridge. `"native"` forces the browser
 *   clipboard; `{ bridge }` routes through a caller-supplied override.
 * @param injectedOnLintResults In-page lint-run sink; only a consumer opting into
 *   in-page linting passes one. Real hosts run the linter themselves.
 * @param injectedReload Restarts the containing webview after an engine change.
 */
function startSession(
    host: HostApi<WebviewState, Command | Query>,
    injectedModules: unknown[] | undefined,
    injectedCapabilities: ModelerCapabilities | undefined,
    injectedLinting: LintingOptions | undefined,
    injectedClipboard: ClipboardOptions | "native" | undefined,
    injectedOnLintResults: ((event: LintRunEvent) => void) | undefined,
    injectedReload: (() => void) | undefined,
): void {
    // The single live surface (View / Design / Implement). Assigned in run()
    // once the engine + initial mode are known, and reassigned on every mode
    // switch — flush/capability callbacks only fire post-init, so the
    // definite-assignment assertion is safe.
    let surface!: SurfaceHandle;
    // The mode the live surface renders, and the mode strip that drives
    // it. `switchPending` blocks re-entrant switches while a recreate is in
    // flight; `initialSurfaceReady` blocks switches until the boot restore,
    // which drives the live surface's state manager, has finished.
    let surfaceMode!: SurfaceMode;
    let strip!: ModeStrip;
    let modeSession: ModeSession | undefined;
    const focusCanvas = (): void => surface.getService<{ focus(): void }>("canvas").focus();
    let switchPending = false;
    let initialSurfaceReady = false;

    const pageInertLocks = createInertLockGroup(document.body);
    const modeSwitchLock = pageInertLocks.createLock();
    const destructiveFlushLock = pageInertLocks.createLock();
    // Never released: the page stays locked until the reload replaces it.
    const engineReloadLock = pageInertLocks.createLock();

    let modelerIsInitialized = false;
    let modelerCanImportHostUpdates = false;
    const hostDocumentRevisions = new HostDocumentRevisions();
    let initialViewerMode = false;
    let latestBpmnFileQuery: BpmnFileQuery | undefined;
    let refreshDiagramWhenReady = false;
    let modelerEngine: DetectedEngine;
    // Theme is host policy: drive the page-level scope (host chrome + the
    // viewer/diff branch, which has no modeler) and the modeler instance's
    // own theme off the VS Code `<body>`-class signal.
    const themeAdapter = createHostThemeAdapter((kind) => {
        applyPageThemeScope("data-bpmn-theme", kind);
        // Route through the session so its stored theme stays current — a
        // later recreate then builds the next surface in the right theme.
        if (modeSession) {
            modeSession.setTheme(kind);
        } else {
            surface?.setTheme(kind);
        }
    });
    let engineReloadPending = false;
    let pendingSessionActionDrain: Promise<void> | undefined;
    let cancelPendingVariablePublish: (() => void) | undefined;
    const protocolCapabilities = createProtocolCapabilities(host, () => surface);
    const clipboard = resolveClipboard(injectedClipboard, {
        isDevelopment: process.env.NODE_ENV === "development",
        host,
    });
    const hostModelerState = new HostModelerState();
    const lintBridge = createLintBridge(
        host,
        { linting: injectedLinting, onLintResults: injectedOnLintResults },
        () => surface,
    );

    // A FocusElementQuery can arrive before the import finishes (host opens the
    // editor and focuses in one tick); apply it once the modeler is ready.
    let pendingFocusId: string | undefined;

    const bpmnFileResolver = createResolver<BpmnFileQuery>();

    // Resolvers that signal when element templates and settings have been
    // applied. Selection restore is deferred until both complete so that
    // side-effects (e.g. transaction-boundary rendering) do not clear the
    // restored selection.
    const elementTemplatesResolver = createResolver<ElementTemplatesQuery>();
    const settingsResolver = createResolver<BpmnModelerSettingQuery>();

    // Resolves once the host has replied with the global properties-panel
    // default. The webview uses this value only when its own webview state has
    // no panelVisible entry — see WebviewStateManager.restorePanelVisibility.
    const panelStateResolver = createResolver<PropertiesPanelStateQuery>();

    const surfaceRequests = createSurfaceRequests(host, () => surface, {
        hostModelerState,
        theme: themeAdapter,
        replies: { elementTemplates: elementTemplatesResolver, settings: settingsResolver },
    });

    /**
     * State manager for persisting and restoring viewport/selection across tab
     * switches. Initialised after the modeler is created.
     */
    let stateManager: WebviewStateManager;

    /**
     * Debounce the update of the XML content to avoid too many updates.
     */
    const serializedModelerOperation = serializeAsync(
        async (operation: () => Promise<void>): Promise<void> => operation(),
    );
    const serializedOpenXml = (bpmn: string | undefined, documentRevision: number): Promise<void> =>
        serializedModelerOperation(() => reloadXmlPreservingView(bpmn, documentRevision));
    const debouncedUpdateXML = asyncDebounce(serializedOpenXml, 100);

    /**
     * Debounces the outbound document sync so a burst of model changes (e.g.
     * properties-panel typing) collapses into one full export + host write
     * instead of one per keystroke. `maxWait` bounds starvation: sustained
     * typing still syncs at least once per second. 300ms/1000ms mirrors the
     * script-streaming debounce. The host recovers the sub-300ms tail via the
     * flush protocol ({@link respondToFlush}) so a save never persists stale XML.
     */
    const debouncedSendXmlChanges = asyncDebounce(sendXmlChanges, 300, { maxWait: 1000 });

    async function flushPendingXmlChanges(): Promise<void> {
        while (debouncedSendXmlChanges.pending()) {
            await debouncedSendXmlChanges.flush();
        }
    }

    function reportHostImportError(error: unknown): void {
        const cause = error instanceof Error ? error : new Error(String(error));
        host.postMessage(
            new LogErrorCommand(`Unable to open host XML\n${cause.message}`, cause.stack),
        );
    }

    async function flushPendingHostUpdates(): Promise<void> {
        while (debouncedUpdateXML.pending()) {
            try {
                await debouncedUpdateXML.flush();
            } catch (error) {
                reportHostImportError(error);
            }
        }
    }

    async function reloadForEngineChange(): Promise<void> {
        if (engineReloadPending) return;
        engineReloadPending = true;
        modelerIsInitialized = false;
        modelerCanImportHostUpdates = false;
        debouncedSendXmlChanges.cancel();
        debouncedUpdateXML.cancel();
        cancelPendingVariablePublish?.();
        refreshDiagramWhenReady = false;
        pendingFocusId = undefined;
        engineReloadLock.acquire();

        await serializedModelerOperation(async () => {
            try {
                debouncedSendXmlChanges.cancel();
                debouncedUpdateXML.cancel();
                await debouncedSendXmlChanges.flush();
                stateManager?.flushViewport();
            } finally {
                try {
                    surface.destroy();
                } finally {
                    (injectedReload ?? (() => window.location.reload()))();
                }
            }
        });
    }

    function drainPendingSessionActions(): Promise<void> {
        if (!pendingSessionActionDrain) {
            pendingSessionActionDrain = (async () => {
                while (!engineReloadPending) {
                    await flushPendingHostUpdates();
                    if (engineReloadPending) return;

                    if (refreshDiagramWhenReady) {
                        refreshDiagramWhenReady = false;
                        try {
                            await serializedModelerOperation(refreshDiagram);
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

                    if (debouncedUpdateXML.pending()) {
                        continue;
                    }

                    if (pendingFocusId !== undefined) {
                        surface.viewport.centerOnElement(pendingFocusId);
                        pendingFocusId = undefined;
                    }
                    return;
                }
            })().finally(() => {
                pendingSessionActionDrain = undefined;
            });
        }
        return pendingSessionActionDrain;
    }

    /**
     * Answers a host {@link FlushDocumentQuery} on the save/close path: exports
     * and returns the pending XML (or reports nothing-pending). The `pending()`
     * gate and cancel-and-carry rationale live in {@link createFlushResponder}.
     */
    const respondToFlush = createFlushResponder(
        {
            isReady: () => modelerIsInitialized,
            hasPendingSync: () => debouncedSendXmlChanges.pending(),
            hasPendingHostUpdate: () => debouncedUpdateXML.pending(),
            hostUpdateVersion: () => hostDocumentRevisions.version,
            documentRevision: () => hostDocumentRevisions.representedRevision,
            flushPendingSync: flushPendingXmlChanges,
            beginDestructiveFlush: () => destructiveFlushLock.acquire(),
            endDestructiveFlush: () => destructiveFlushLock.release(),
            exportContent: () => surface.exportDiagram(),
        },
        (reply) => host.postMessage(reply),
    );

    const sessionMessages = createSessionMessageRouter(
        host,
        {
            ...surfaceRequests.handlers,
            ...lintBridge.handlers,
            ...clipboard.handlers,
            ...protocolCapabilities.handlers,
            BpmnFileQuery: receiveHostFile,
            PropertiesPanelStateQuery: (query) => panelStateResolver.done(query),
            LanguageQuery: applyHostLanguage,
            FocusElementQuery: focusElementWhenReady,
            TakeFocusQuery: () => takeFocus(focusCanvas),
            FlushDocumentQuery: respondToFlush,
            ReleaseDocumentFlushQuery: respondToFlush,
        },
        { isReloading: () => engineReloadPending },
    );

    /**
     * Re-imports the XML while preserving the user's drill-down plane, viewbox,
     * and selection. The snapshot is taken from the live canvas inside the
     * debounced function so a burst of host pushes captures once, not from a
     * half-imported intermediate.
     */
    async function reloadXmlPreservingView(
        bpmn: string | undefined,
        documentRevision: number,
    ): Promise<void> {
        const snapshot = stateManager?.captureViewState();
        try {
            await openHostXml(bpmn, documentRevision);
        } finally {
            // Re-apply even when a post-import side-effect threw — the import
            // itself already reset the canvas to the top-level plane, and
            // skipping the restore would strand the user there.
            if (snapshot) {
                stateManager.applyViewState(snapshot);
            }
        }
    }

    /**
     * Entry point executed once the webview DOM is fully loaded.
     *
     * Registers the message listener first so no backend messages are missed,
     * then requests the BPMN file together with the settings and panel state.
     * Element templates and the lint config depend on the surface kind, so they
     * are requested once the surface exists but before the import. Replies that
     * act on the diagram are held until the initial import has completed.
     *
     * There are two reasons the webview is built:
     * 1. A new `.bpmn` file was opened.
     * 2. The user switched away and back to the tab.
     */
    async function run(): Promise<void> {
        // The diff branch below swaps in its own router once the host names the pane.
        let routeHostMessage: HostMessageRoute = sessionMessages.route;
        window.addEventListener("message", (event: MessageEvent<HostMessage>) =>
            routeHostMessage(event.data),
        );

        // Merge the modeler's local overlay (mode-strip labels, script-lock
        // badges, C7/dmn-js internals the shared package lacks) onto the shared
        // dictionaries. createModeler/createDesigner also extend it, but the mode
        // strip mounts before any surface and a View-first start never builds a
        // modeler, so the webview extends here so the strip is translated either
        // way. Idempotent — a later surface's extend is a no-op merge.
        i18n.extend(i18nExtras);

        // The instance is also born correct via `theme: resolveHostThemeKind()`
        // below, so this mainly covers the page chrome and later live theme switches.
        themeAdapter.setMode("automatic");

        // Viewer mode (one side of a diff view) skips the resizer + properties
        // panel + palette, so we don't call initResizer() here — the chrome is
        // hidden by .viewer-mode CSS once we confirm the mode below. For the
        // modeler path, initResizer() is called after the branch check.

        host.postMessage(new GetBpmnFileCommand());
        host.postMessage(new GetBpmnModelerSettingCommand());
        host.postMessage(new GetPropertiesPanelStateCommand());
        const savedMode = readSavedMode(host);
        if (savedMode) {
            prefetchSurfaceModules(savedMode, { linting: injectedLinting === undefined });
        }

        const bpmnFileQuery = await bpmnFileResolver.wait();

        // Before any surface exists, so the matching LanguageQuery later skips the re-import.
        if (bpmnFileQuery?.locale) {
            i18n.setLanguage(bpmnFileQuery.locale as SupportedLocale);
        }

        /**
         * Diff view: host told us this pane is one half of a diff, so bootstrap
         * the readonly DiffMode and skip the editable modeler entirely.
         */
        if (bpmnFileQuery?.viewerMode === "viewer") {
            // A diff pane has no surface for the held replies or any later session
            // message; it only follows language changes.
            sessionMessages.discardImportBound();
            routeHostMessage = createHostMessageRouter<DiffPaneHostMessages>(host, {
                LanguageQuery: (query) => {
                    i18n.setLanguage(query.locale as SupportedLocale);
                },
            });
            document.body.classList.add("viewer-mode");
            const canvas = document.getElementById("js-canvas");
            const dropZone = document.getElementById("js-drop-zone");
            if (!canvas || !dropZone) {
                console.error("Diff mode: missing #js-canvas or #js-drop-zone");
                return;
            }
            const { DiffMode } = await import("./diffMode");
            const diffMode = new DiffMode(canvas, dropZone, host);
            await diffMode.startWith(bpmnFileQuery.content);
            return;
        }

        // Host HTML keeps its `js-canvas` / `js-properties-panel` ids; the
        // facade takes the resolved elements, not selectors, so a second modeler
        // (in-page diff) can pass its own DOM hosts with no ids.
        const canvasEl = document.getElementById("js-canvas");
        const propertiesPanelParent = document.getElementById("js-properties-panel");
        if (!canvasEl || !propertiesPanelParent) {
            host.postMessage(
                new LogErrorCommand("Missing #js-canvas or #js-properties-panel in host HTML"),
            );
            return;
        }

        // The mode strip + panel mount are created at runtime (all three shells
        // ship only the empty `#js-canvas` / `#js-properties-panel`). The strip
        // sits on the canvas; the panel mount — not the host — is
        // the properties-panel parent and the panel-shortcut root. `initResizer`
        // still binds to the host by its hard-coded id, so its collapse behaviour
        // is unchanged.
        propertiesPanelParent.classList.add("panel-host");
        const stripEl = document.createElement("div");
        stripEl.id = "js-mode-strip";
        stripEl.className = "mode-strip";
        const mountEl = document.createElement("div");
        mountEl.id = "js-properties-panel-mount";
        mountEl.className = "panel-mount";
        canvasEl.prepend(stripEl);
        propertiesPanelParent.append(mountEl);

        const propertiesPanelHandle = initResizer({
            getToggleLabel: (state) =>
                i18n.translate(
                    state === "collapsed" ? "Open properties panel" : "Close properties panel",
                ) + " (Shift+P)",
            onLabelChange: (apply) => i18n.onChange(apply),
        });

        // Early-apply this editor's own saved panel visibility (if any) before
        // diagram import so the panel snaps straight to the correct per-editor
        // state — no flash, no wait on the host round-trip, and it neutralizes
        // the stale global-default hint baked into the pre-rendered HTML. When
        // absent, the host global default is applied later (once its reply
        // arrives). Applied via the handle so the resizer's DOM-seeded
        // `isCollapsed` stays in sync.
        const savedPanelVisible = readSavedPanelVisibility(host);
        if (savedPanelVisible !== undefined) {
            propertiesPanelHandle.setVisible(savedPanelVisible);
        }

        // The engine may be undefined here — an untagged (engine-neutral) model
        // is first-class now and opens in Design. The initial mode resolves from
        // this editor's saved mode, then the host's default, then the engine's
        // own default — the mode session vets it against availability.
        const engine = bpmnFileQuery?.engine;
        modelerEngine = engine;

        const capabilities = injectedCapabilities ?? protocolCapabilities.capabilities;
        const extraModules = (injectedModules as unknown[]) ?? [];

        // The three surface factories the mode session switches between. View →
        // readonly viewer; Design on an untagged model → the engine-neutral
        // designer; Design/Implement on a tagged model → one createModeler whose
        // `mode` toggles live. Every surface is born in the IDE's forced theme so
        // the first frame paints correctly (the body class is the IDE signal, not
        // "automatic"). Both editable surfaces share the lint bridge's options;
        // the designer resolves the engine-neutral Design config, the modeler
        // re-resolves per mode on a live toggle.
        const surfaces: SurfaceFactories = {
            view: async ({ container, theme }) => {
                const { createViewer } = await loadViewerModule();
                return createViewer(container, {
                    theme,
                    propertiesPanel: { parent: mountEl },
                    capabilities: { modelNavigation: capabilities.modelNavigation },
                    additionalModules: extraModules,
                });
            },
            design: async ({ container, theme }) => {
                const [{ createDesigner }, linting] = await Promise.all([
                    loadDesignerModule(),
                    lintBridge.surfaceOptions(),
                ]);
                const settingsAtCreation = hostModelerState.settings;
                const designer = await createDesigner(container, {
                    theme,
                    favouriteBpmnElements: settingsAtCreation?.favouriteBpmnElements,
                    propertiesPanel: { parent: mountEl },
                    clipboard: clipboard.options,
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
            implement: async ({ container, theme, mode, engine: ctxEngine }) => {
                if (ctxEngine === undefined) {
                    // The session only routes Implement (and tagged-model Design)
                    // here, so this is unreachable — throw rather than lie to
                    // createModeler's `engine: Engine`.
                    throw new Error("implement surface requires a tagged model");
                }
                const [{ createModeler }, linting] = await Promise.all([
                    loadModelerModule(),
                    lintBridge.surfaceOptions(),
                ]);
                const settingsAtCreation = hostModelerState.settings;
                const modeler = await createModeler(container, {
                    engine: ctxEngine,
                    mode,
                    theme,
                    settings: settingsAtCreation,
                    propertiesPanel: { parent: mountEl },
                    additionalModules: extraModules,
                    clipboard: clipboard.options,
                    capabilities,
                    ...linting,
                    onWarning: (warning: string) =>
                        host.postMessage(new LogWarningCommand(warning)),
                    onElementTemplatesErrors: surfaceRequests.reportElementTemplateErrors,
                    // The modeler's own toggle notification. The session also
                    // fires onModeChanged("toggle"); both write the same values, so
                    // keeping this (the session cannot inject into the options bag)
                    // is a harmless redundancy, not a second source of truth.
                    onModeChanged: (m: ModelerMode) => {
                        surfaceMode = m;
                        stateManager?.persistMode(m);
                        strip?.render({ mode: m, engine: modelerEngine, busy: switchPending });
                    },
                    handleGlobalEscape: true,
                });
                // A push during the async init only reached the previous surface.
                hostModelerState.applySettingsPushedSince(settingsAtCreation, modeler);
                return modeler;
            },
        };

        // Rebinds the per-surface subscriptions on every (re)creation: outbound
        // sync, the C7 variable publisher, and the state manager. All of these
        // live on the instance and die with it, so a mode switch that forgot to
        // rebind would silently stop syncing/persisting.
        function bindSurface(handle: SurfaceHandle): void {
            // Outbound sync: the modeler exposes onCommandStackChanged; the
            // designer emits via the shared eventBus; the readonly viewer never
            // schedules a sync (so respondToFlush sees nothing pending in View).
            if (isModelerHandle(handle)) {
                handle.onCommandStackChanged(() => void debouncedSendXmlChanges());
            } else if (isEditableHandle(handle)) {
                handle
                    .getService<{ on(event: string, cb: () => void): void }>("eventBus")
                    .on("commandStack.changed", () => void debouncedSendXmlChanges());
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

            // C7 process-variable publisher — modeler-only (scripting is a C7
            // cluster). Gated on the engine and the port being present, like the
            // capability that owns it.
            if (isModelerHandle(handle) && modelerEngine === "c7" && capabilities.scripting) {
                let lastVariablesJson = "";
                const sendVariables = asyncDebounce(async () => {
                    if (engineReloadPending) return;
                    const variables = extractProcessVariables(handle.getDefinitions());
                    const json = JSON.stringify(variables);
                    if (json === lastVariablesJson) {
                        return;
                    }
                    lastVariablesJson = json;
                    host.postMessage(new UpdateScriptVariablesCommand(variables));
                }, 300);
                cancelPendingVariablePublish = () => sendVariables.cancel();
                handle.onCommandStackChanged(() => {
                    if (!engineReloadPending) void sendVariables();
                });
                // commandStack.changed doesn't fire on import, and a webview
                // reload starts with an empty host-side store, so seed it.
                void sendVariables();
            } else {
                cancelPendingVariablePublish = undefined;
            }

            stateManager = new WebviewStateManager(host, handle, mountEl);
        }

        // Element templates are modeler-only; a viewer/designer never receives
        // them, so its ElementTemplatesQuery would never arrive and the restore
        // chain's Promise.all would stall — resolve the templates gate immediately
        // instead. The lint config request goes to any editable (linting) surface:
        // the designer lints too, and the host answers an untagged doc
        // with the engine-less default the webview builds.
        function requestSurfaceResources(): void {
            if (isModelerHandle(surface)) {
                host.postMessage(new GetElementTemplatesCommand());
            } else {
                elementTemplatesResolver.done(undefined);
            }
            if (isLintingHandle(surface)) {
                host.postMessage(new GetBpmnlintConfigCommand());
            }
        }

        // The session owns the single live surface and switches it between the
        // available modes: a Design↔Implement change on a tagged model is a live
        // `setMode` toggle (undo/selection/plane survive), anything else exports →
        // destroys → recreates → restores. It builds the initial surface but does
        // not load a diagram — the webview's own import path (below) does that.
        try {
            modeSession = await createModeSession({
                container: canvasEl,
                engine,
                surfaces,
                initialMode: savedMode ?? bpmnFileQuery?.defaultMode ?? null,
                theme: resolveHostThemeKind(),
                onSurfaceCreated: (handle) => {
                    surface = handle as SurfaceHandle;
                    // The initial surface binds after its import (below), matching
                    // the pre-session flow; a recreate/fallback binds here, before
                    // the session loads the carried XML.
                    if (modelerIsInitialized) {
                        bindSurface(surface);
                    }
                },
                onSwitchStateChanged: (busy) => {
                    switchPending = busy;
                    if (busy) {
                        modeSwitchLock.acquire();
                    } else {
                        modeSwitchLock.release();
                    }
                    strip.render({ mode: surfaceMode, engine: modelerEngine, busy });
                },
                onModeChanged: (mode, transition) => {
                    surfaceMode = mode;
                    stateManager.persistMode(mode);
                    strip.render({ mode, engine: modelerEngine, busy: switchPending });
                    // A recreate/fallback stood up a fresh instance: re-apply the
                    // host's script locks, restore its panel UI, resume persistence,
                    // and re-request modeler resources.
                    if (transition === "recreate" || transition === "fallback") {
                        // A recreate already applied the carried snapshot; a
                        // fallback applied none, so the persisted state restores.
                        if (transition === "fallback") {
                            stateManager.restoreViewport();
                        }
                        // After the import: the script-source watcher baselines
                        // the locked scripts from the loaded model.
                        if (isModelerHandle(surface)) {
                            hostModelerState.restoreOpenScripts(surface);
                        }
                        stateManager.restorePanelUiState();
                        stateManager.startPersisting();
                        requestSurfaceResources();
                    }
                },
                beforeDestroy: async () => {
                    await flushPendingXmlChanges();
                    debouncedSendXmlChanges.cancel();
                    cancelPendingVariablePublish?.();
                },
                onError: (error) => {
                    const cause = error instanceof Error ? error : new Error(String(error));
                    host.postMessage(
                        new LogErrorCommand(`Unable to switch mode\n${cause.message}`, cause.stack),
                    );
                },
            });
        } catch (error: any) {
            if (error instanceof NoModelerError || error instanceof UnsupportedEngineError) {
                host.postMessage(new LogErrorCommand(error.message));
            } else {
                const cause = error instanceof Error ? error : new Error(String(error));
                host.postMessage(
                    new LogErrorCommand(
                        `Unable to create modeler surface\n${cause.message}`,
                        cause.stack,
                    ),
                );
            }
            return;
        }
        surfaceMode = modeSession.getMode();
        requestSurfaceResources();

        // Always offer all three modes, greying out the ones the current
        // engine can't reach (Implement on an untagged model) so the mode is
        // discoverable — the strip ignores clicks on an aria-disabled entry. A
        // click is also dropped until the initial surface is ready and while a
        // switch or engine reload is in flight, and otherwise queues behind the
        // other modeler operations so it never interleaves with an import.
        strip = mountModeStrip({
            host: propertiesPanelParent,
            stripEl,
            modes: SURFACE_MODES,
            translate: (template, replacements) => i18n.translate(template, replacements),
            onLabelChange: (apply) => i18n.onChange(apply),
            onSelect: (mode) => {
                if (!initialSurfaceReady || switchPending || engineReloadPending) return;
                void serializedModelerOperation(() => modeSession!.requestMode(mode));
            },
            onEscape: focusCanvas,
        });
        strip.render({ mode: surfaceMode, engine, busy: true });

        let importedBpmnFileQuery = latestBpmnFileQuery ?? bpmnFileQuery;
        while (importedBpmnFileQuery) {
            if (importedBpmnFileQuery.engine !== modelerEngine) {
                await reloadForEngineChange();
                return;
            }
            try {
                await serializedOpenXml(
                    importedBpmnFileQuery.content,
                    importedBpmnFileQuery.documentRevision,
                );
                break;
            } catch (error) {
                if (latestBpmnFileQuery && latestBpmnFileQuery !== importedBpmnFileQuery) {
                    reportHostImportError(error);
                    importedBpmnFileQuery = latestBpmnFileQuery;
                    continue;
                }
                const message = error instanceof Error ? error.message : String(error);
                host.postMessage(new LogErrorCommand(`Unable to open XML\n${message}`));
                return;
            }
        }

        modelerCanImportHostUpdates = true;

        if (latestBpmnFileQuery && latestBpmnFileQuery !== importedBpmnFileQuery) {
            if (latestBpmnFileQuery.engine !== modelerEngine) {
                await reloadForEngineChange();
                return;
            }
            try {
                await debouncedUpdateXML(
                    latestBpmnFileQuery.content,
                    latestBpmnFileQuery.documentRevision,
                );
            } catch (error) {
                reportHostImportError(error);
            }
        }
        await flushPendingHostUpdates();
        if (engineReloadPending) return;

        const currentBpmnFileQuery = latestBpmnFileQuery ?? bpmnFileQuery;

        if (injectedCapabilities === undefined) {
            protocolCapabilities.requestFormReferenceStatus(currentBpmnFileQuery?.engine);
        }

        console.debug("[DEBUG] Modeler is initialized...");

        bindSurface(surface);

        // Lets the IntelliJ JCEF host drive undo/redo: it swallows Ctrl+Z/Ctrl+Y
        // at the IDE level before bpmn-js sees them. Installed once, over the
        // polymorphic surface; the readonly viewer has no editorActions service,
        // so the trigger is guarded.
        installHostEditorActions((action) => {
            if (isEditableHandle(surface)) {
                surface
                    .getService<{ trigger(action: string): void }>("editorActions")
                    .trigger(action);
            }
        });

        // Phase 1: restore the persisted plane and viewport (canvas exists after
        // openXml); the surface itself fits a fresh open.
        stateManager.restoreViewport();

        await drainPendingSessionActions();
        if (engineReloadPending) return;
        modelerIsInitialized = true;
        sessionMessages.openImportBound();
        // A held LanguageQuery may have queued a refresh; it must land before
        // the selection restore below.
        await drainPendingSessionActions();
        if (engineReloadPending) return;

        // Panel visibility: this editor's own saved entry (applied early above)
        // wins. Only when absent do we fall back to the host's global default —
        // the seed for a first-ever open. This branch is deliberately *not*
        // gated on templates/settings, so a slow or dropped templates reply
        // cannot leave the panel stuck at the pre-rendered default.
        if (savedPanelVisible === undefined) {
            const panelStateQuery = await panelStateResolver.wait(HOST_REPLY_TIMEOUT_MS);
            if (engineReloadPending) return;
            stateManager.restorePanelVisibility(
                propertiesPanelHandle,
                panelStateQuery?.visible ?? true,
            );
        }

        // Report user toggles: persist this editor's own state AND update the
        // host's global default so the latest preference seeds new editors.
        // Registered after restore so the restore itself can't echo back.
        propertiesPanelHandle.onVisibilityChanged((visible) => {
            stateManager.persistPanelVisibility(visible);
            host.postMessage(new SetPropertiesPanelStateCommand(visible));
        });

        // `p` focuses the panel mount (expanding it first if collapsed); `Shift+P`
        // toggles panel visibility. Installed once, over the polymorphic surface.
        installPanelShortcuts(
            {
                handle: propertiesPanelHandle,
                focusCanvas,
                isCanvasFocused: () =>
                    surface.getService<{ isFocused(): boolean }>("canvas").isFocused(),
            },
            { getPanelRoot: () => mountEl },
        );
        installCanvasAutoFocus({ focusCanvas });
        host.postMessage(new RequestFocusCommand());

        // Selection + panel-side UI state must wait until element-template and
        // settings side-effects have run (they clear selection; group indexes are
        // positional per selected element). The timeouts guarantee this chain
        // always reaches startPersisting even if a host reply is dropped.
        await Promise.all([
            elementTemplatesResolver.wait(HOST_REPLY_TIMEOUT_MS),
            settingsResolver.wait(HOST_REPLY_TIMEOUT_MS),
        ]);
        if (engineReloadPending) return;

        // Phase 2: restore selection + panel-side UI state (side-effects done)
        stateManager.restoreSelection();
        stateManager.restorePanelUiState();

        // The initial surface is live: drop the strip's busy state and persist the
        // resolved mode so a first-ever open remembers where it landed.
        initialSurfaceReady = true;
        strip.render({ mode: surfaceMode, engine: modelerEngine, busy: false });
        stateManager.persistMode(surfaceMode);

        // Phase 3: begin persisting changes
        stateManager.startPersisting();
    }

    async function openHostXml(bpmn: string | undefined, documentRevision: number): Promise<void> {
        await openXml(bpmn);
        hostDocumentRevisions.markImported(documentRevision);
    }

    /**
     * Loads or replaces the diagram in the modeler with the given BPMN XML.
     * Creates a blank diagram when `bpmn` is `undefined` or empty.
     *
     * @param bpmn BPMN XML string, or `undefined` for a new blank diagram.
     * @throws {NoModelerError} If the modeler is not available.
     */
    async function openXml(bpmn?: string): Promise<void> {
        let result: ImportXMLResult;
        // Only an editable surface can create a blank diagram; the readonly
        // viewer always loads the host XML (a diff/View pane never opens blank).
        if (!bpmn && isEditableHandle(surface)) {
            result = await surface.newDiagram();
        } else {
            result = await surface.loadDiagram(bpmn ?? "");
        }

        if (result.warnings.length > 0) {
            const warnings = `Diagram opened with following warnings: ${formatErrors(result.warnings)}`;
            host.postMessage(new LogWarningCommand(warnings));
        }
    }

    /**
     * Exports the current diagram XML and sends it to the backend to persist the
     * changes, then triggers an align-to-origin pass if the setting is enabled.
     *
     * Runs at debounce-fire time now, not per model change. Align-to-origin
     * therefore also runs debounced (and is skipped on the flush path, where we
     * only export); the next edit realigns. That align emits its own
     * `commandStack.changed`, which schedules one more debounced cycle — but a
     * no-op align executes no commands, so the cycle terminates rather than looping.
     */
    async function sendXmlChanges(): Promise<void> {
        // A rejection here only reaches the global unhandledrejection hook
        // (diagram-js discards the returned promise) as a context-free line —
        // catch it so the failure is named and deterministic on the channel.
        try {
            const versionAtExport = hostDocumentRevisions.version;
            const bpmn = await surface.exportDiagram();

            if (!hostDocumentRevisions.isCurrent(versionAtExport) || debouncedUpdateXML.pending()) {
                return;
            }

            host.postMessage(
                new SyncDocumentCommand(bpmn, hostDocumentRevisions.representedRevision),
            );
            // Align-to-origin is a modeler-only feature; the designer/viewer skip it.
            if (isModelerHandle(surface)) {
                surface.alignElementsToOrigin();
            }
        } catch (error) {
            const e = error instanceof Error ? error : new Error(String(error));
            host.postMessage(
                new LogErrorCommand(`Failed to sync diagram changes: ${e.message}`, e.stack),
            );
        }
    }

    async function receiveHostFile(bpmnFileQuery: BpmnFileQuery): Promise<void> {
        const documentRevision = bpmnFileQuery.documentRevision ?? 0;
        const receipt = hostDocumentRevisions.receive(documentRevision);

        if (receipt === "stale") return;

        latestBpmnFileQuery = bpmnFileQuery;

        if (receipt === "initial") {
            initialViewerMode = bpmnFileQuery.viewerMode === "viewer";
            bpmnFileResolver.done(bpmnFileQuery);
        } else if (!initialViewerMode) {
            // A host push (e.g. a raw-XML side-by-side edit) is
            // authoritative. Drop any pending outbound sync first so a
            // stale export firing after the re-import can't clobber it.
            debouncedSendXmlChanges.cancel();
            if (modelerCanImportHostUpdates) {
                if (bpmnFileQuery.engine !== modelerEngine) {
                    await reloadForEngineChange();
                    return;
                }
                try {
                    await debouncedUpdateXML(bpmnFileQuery.content, documentRevision);
                } finally {
                    if (modelerIsInitialized) {
                        await drainPendingSessionActions();
                    }
                }
            }
        }
    }

    async function applyHostLanguage(query: LanguageQuery): Promise<void> {
        // Switch the shared translator; the DI-bound service and all
        // onChange subscribers (resizer, diff legend, …) pick it up.
        // bpmn-js itself still needs a diagram re-import to re-invoke
        // translate() for already-rendered elements — skipped in
        // viewer mode where there is no editable modeler.
        // The host pushes the language on every (re)load, not only on
        // change. Compare resolved locales (setLanguage falls back to
        // "en" for unknown codes) and skip the destructive re-import
        // when nothing changed — a tab re-show must not re-import.
        const localeBefore = i18n.getLocale();
        i18n.setLanguage(query.locale as SupportedLocale);
        if (i18n.getLocale() !== localeBefore) {
            refreshDiagramWhenReady = !initialViewerMode;
            if (modelerIsInitialized) {
                await drainPendingSessionActions();
            }
        }
    }

    async function focusElementWhenReady({ elementId }: FocusElementQuery): Promise<void> {
        pendingFocusId = elementId;
        if (modelerIsInitialized) {
            await drainPendingSessionActions();
        }
    }

    /**
     * Re-renders the diagram by exporting and re-importing the XML.
     *
     * Preserves the current drill-down plane, viewport, and selection so the
     * user does not lose their place. Used after a language switch to force
     * bpmn-js to re-invoke `translate()` for all UI elements.
     */
    async function refreshDiagram(): Promise<void> {
        const xml = await surface.exportDiagram();
        const snapshot = stateManager.captureViewState();
        try {
            await surface.loadDiagram(xml);
        } finally {
            // Same rationale as reloadXmlPreservingView: the re-import has
            // already reset the plane, so restore even on a late throw.
            stateManager.applyViewState(snapshot);
        }
    }

    // Best-effort flush of the outbound sync debounce when the webview is hidden
    // (tab switch / close). Reliable in the persistent JCEF host; in VS Code the
    // webview context may be torn down mid-export, so this is a best-effort
    // mitigation of the ≤300ms hide-loss window — the save path is fully covered
    // by the flush protocol instead. Registered per-session (not at import) so a
    // torn-down session leaves no listener behind.
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && !engineReloadPending) {
            void debouncedSendXmlChanges.flush();
            stateManager?.flushViewport();
        }
    });

    installGlobalErrorForwarding((command) => host.postMessage(command));
    if (document.readyState === "complete") {
        void run();
    } else {
        window.addEventListener("load", () => void run());
    }
}
