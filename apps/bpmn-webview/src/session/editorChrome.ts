import { i18n } from "@miragon/bpmn-modeler-i18n";
import {
    initResizer,
    LogErrorCommand,
    type PropertiesPanelHandle,
    readSavedPanelVisibility,
    type WebviewStateHost,
} from "@miragon/bpmn-modeler-shared";

import type { WebviewState } from "../webviewState";
import type { HostChannel } from "./hostChannel";

export interface EditorChrome {
    canvas: HTMLElement;
    /** Carries the strip's `data-surface-mode` / `aria-busy`; the resizer collapses it. */
    panelHost: HTMLElement;
    stripEl: HTMLElement;
    /** The properties-panel parent and the panel-shortcut root. */
    panelMount: HTMLElement;
    panel: PropertiesPanelHandle;
    /** Already applied; `undefined` leaves the panel to the host's global default. */
    savedPanelVisible: boolean | undefined;
}

/** `undefined` when the host HTML lacks the canvas or the panel host; the failure is reported. */
export function mountEditorChrome(
    host: HostChannel & WebviewStateHost<WebviewState>,
): EditorChrome | undefined {
    // Host HTML keeps its `js-canvas` / `js-properties-panel` ids; the
    // facade takes the resolved elements, not selectors, so a second modeler
    // (in-page diff) can pass its own DOM hosts with no ids.
    const canvas = document.getElementById("js-canvas");
    const panelHost = document.getElementById("js-properties-panel");
    if (!canvas || !panelHost) {
        host.postMessage(
            new LogErrorCommand("Missing #js-canvas or #js-properties-panel in host HTML"),
        );
        return undefined;
    }

    // The mode strip + panel mount are created at runtime (all three shells
    // ship only the empty `#js-canvas` / `#js-properties-panel`). The strip
    // sits on the canvas; the panel mount — not the host — is
    // the properties-panel parent and the panel-shortcut root. `initResizer`
    // still binds to the host by its hard-coded id, so its collapse behaviour
    // is unchanged.
    panelHost.classList.add("panel-host");
    const stripEl = document.createElement("div");
    stripEl.id = "js-mode-strip";
    stripEl.className = "mode-strip";
    const panelMount = document.createElement("div");
    panelMount.id = "js-properties-panel-mount";
    panelMount.className = "panel-mount";
    canvas.prepend(stripEl);
    panelHost.append(panelMount);

    const panel = initResizer({
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
        panel.setVisible(savedPanelVisible);
    }

    return { canvas, panelHost, stripEl, panelMount, panel, savedPanelVisible };
}
