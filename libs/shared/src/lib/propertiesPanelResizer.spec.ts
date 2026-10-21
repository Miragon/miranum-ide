// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { initResizer, type PropertiesPanelResizerOptions } from "./propertiesPanelResizer";

const OPEN_LABEL = "Open properties panel";
const CLOSE_LABEL = "Close properties panel";

const toggleLabels: PropertiesPanelResizerOptions["getToggleLabel"] = (state) =>
    state === "collapsed" ? OPEN_LABEL : CLOSE_LABEL;

function renderPanelMarkup({ width = 300, collapsed = false } = {}): {
    resizer: HTMLElement;
    panel: HTMLElement;
} {
    const resizer = document.createElement("div");
    resizer.id = "js-panel-resizer";
    const panel = document.createElement("div");
    panel.id = "js-properties-panel";
    if (collapsed) {
        resizer.classList.add("collapsed");
        panel.classList.add("collapsed");
    }
    // jsdom has no layout, so the rendered width the drag starts from is stubbed.
    Object.defineProperty(panel, "offsetWidth", { value: collapsed ? 0 : width });
    document.body.append(panel, resizer);
    return { resizer, panel };
}

function setUp(markup: { width?: number; collapsed?: boolean } = {}) {
    const { resizer, panel } = renderPanelMarkup(markup);
    const handle = initResizer({ getToggleLabel: toggleLabels });
    const visibilityChanges: boolean[] = [];
    handle.onVisibilityChanged((visible) => visibilityChanges.push(visible));
    const toggleButton = resizer.querySelector("button")!;
    return { resizer, panel, handle, visibilityChanges, toggleButton };
}

function pressAt(target: HTMLElement, clientX: number): void {
    target.dispatchEvent(new MouseEvent("mousedown", { clientX, bubbles: true }));
}

function moveTo(clientX: number): void {
    document.dispatchEvent(new MouseEvent("mousemove", { clientX }));
}

function moveInSteps(fromX: number, toX: number, step: number): void {
    const direction = Math.sign(toX - fromX);
    for (let x = fromX + direction * step; direction * (toX - x) >= 0; x += direction * step) {
        moveTo(x);
    }
}

function release(): void {
    document.dispatchEvent(new MouseEvent("mouseup"));
}

afterEach(() => {
    // initResizer has no dispose, so end any drag a test left open before the
    // next test's document listeners join the stale ones.
    release();
    document.body.replaceChildren();
    document.body.removeAttribute("style");
    vi.restoreAllMocks();
});

describe("initResizer", () => {
    it("returns an inert, always-visible handle when the panel markup is missing", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const listener = vi.fn();

        const handle = initResizer({ getToggleLabel: toggleLabels });
        handle.onVisibilityChanged(listener);
        handle.setVisible(false);

        expect(handle.isVisible()).toBe(true);
        expect(listener).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it("adopts a host pre-rendered collapsed panel without a spurious notification", () => {
        const { panel, handle, visibilityChanges, toggleButton } = setUp({ collapsed: true });

        handle.setVisible(false);

        expect(handle.isVisible()).toBe(false);
        expect(panel.classList.contains("collapsed")).toBe(true);
        expect(visibilityChanges).toEqual([]);
        expect(toggleButton.getAttribute("aria-label")).toBe(OPEN_LABEL);
    });

    it("does not notify when asked to show an already visible panel", () => {
        const { panel, handle, visibilityChanges } = setUp({ width: 300 });

        handle.setVisible(true);

        expect(visibilityChanges).toEqual([]);
        expect(panel.style.width).toBe("");
    });

    it("collapses on setVisible(false) and offers the open action", () => {
        const { resizer, panel, handle, visibilityChanges, toggleButton } = setUp();

        handle.setVisible(false);

        expect(handle.isVisible()).toBe(false);
        expect(panel.style.width).toBe("0px");
        expect(panel.classList.contains("collapsed")).toBe(true);
        expect(resizer.classList.contains("collapsed")).toBe(true);
        expect(visibilityChanges).toEqual([false]);
        expect(toggleButton.getAttribute("aria-label")).toBe(OPEN_LABEL);
        expect(toggleButton.title).toBe(OPEN_LABEL);
    });

    it("reopens a collapsed panel at twice the minimum width on setVisible(true)", () => {
        const { resizer, panel, handle, visibilityChanges, toggleButton } = setUp({
            collapsed: true,
        });

        handle.setVisible(true);

        expect(handle.isVisible()).toBe(true);
        expect(panel.style.width).toBe("400px");
        expect(panel.classList.contains("collapsed")).toBe(false);
        expect(resizer.classList.contains("collapsed")).toBe(false);
        expect(visibilityChanges).toEqual([true]);
        expect(toggleButton.getAttribute("aria-label")).toBe(CLOSE_LABEL);
    });

    it("keeps notifying the remaining listeners when one throws", () => {
        const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const { handle, visibilityChanges } = setUp();
        const laterListener = vi.fn();
        handle.onVisibilityChanged(() => {
            throw new Error("listener failed");
        });
        handle.onVisibilityChanged(laterListener);

        handle.setVisible(false);

        expect(visibilityChanges).toEqual([false]);
        expect(laterListener).toHaveBeenCalledWith(false);
        expect(logError).toHaveBeenCalledTimes(1);
    });

    it("closes and reopens the panel from the toggle button", () => {
        const { panel, handle, visibilityChanges, toggleButton } = setUp();

        toggleButton.click();
        expect(handle.isVisible()).toBe(false);

        toggleButton.click();
        expect(handle.isVisible()).toBe(true);
        expect(panel.style.width).toBe("400px");
        expect(visibilityChanges).toEqual([false, true]);
    });

    it("does not start a drag when the toggle button is pressed", () => {
        const { panel, toggleButton } = setUp({ width: 300 });

        pressAt(toggleButton, 500);
        moveTo(400);

        expect(document.body.style.cursor).toBe("");
        expect(panel.style.width).toBe("");
    });

    it("re-applies the toggle label when the language changes", () => {
        renderPanelMarkup();
        let language = "en";
        let reapplyLabel: () => void = () => undefined;
        initResizer({
            getToggleLabel: (state) => `${language}:${state}`,
            onLabelChange: (apply) => {
                reapplyLabel = apply;
            },
        });
        const toggleButton = document.querySelector("#js-panel-resizer button")!;

        language = "de";
        reapplyLabel();

        expect(toggleButton.getAttribute("aria-label")).toBe("de:open");
        expect(toggleButton.getAttribute("title")).toBe("de:open");
    });

    describe("dragging the divider", () => {
        it("widens the panel when dragged left and narrows it when dragged right", () => {
            const { resizer, panel } = setUp({ width: 300 });

            pressAt(resizer, 500);
            moveTo(400);
            expect(panel.style.width).toBe("400px");

            moveTo(450);
            expect(panel.style.width).toBe("350px");
        });

        it("shows the resize cursor and blocks text selection until the mouse is released", () => {
            const { resizer, panel } = setUp({ width: 300 });

            pressAt(resizer, 500);
            expect(document.body.style.cursor).toBe("col-resize");
            expect(document.body.style.userSelect).toBe("none");

            release();
            moveTo(100);

            expect(document.body.style.cursor).toBe("");
            expect(document.body.style.userSelect).toBe("");
            expect(panel.style.width).toBe("");
        });

        it("never widens the panel beyond the maximum width", () => {
            const { resizer, panel } = setUp({ width: 300 });

            pressAt(resizer, 500);
            moveTo(-2000);

            expect(panel.style.width).toBe("1600px");
        });

        it("stops narrowing at the minimum width and keeps the panel open", () => {
            const { resizer, panel, handle, visibilityChanges } = setUp({ width: 300 });

            pressAt(resizer, 500);
            moveInSteps(500, 750, 10);

            expect(panel.style.width).toBe("200px");
            expect(handle.isVisible()).toBe(true);
            expect(visibilityChanges).toEqual([]);
        });

        it("collapses once the drag carries the intended width down to zero", () => {
            const { resizer, panel, handle, visibilityChanges } = setUp({ width: 300 });

            pressAt(resizer, 500);
            moveInSteps(500, 800, 10);

            expect(handle.isVisible()).toBe(false);
            expect(panel.style.width).toBe("0px");
            expect(visibilityChanges).toEqual([false]);
        });

        it("previews a collapsed panel at the minimum width as soon as it is dragged open", () => {
            const { resizer, panel, handle, visibilityChanges } = setUp({ collapsed: true });

            pressAt(resizer, 500);
            moveTo(499);

            expect(handle.isVisible()).toBe(true);
            expect(panel.style.width).toBe("200px");
            expect(visibilityChanges).toEqual([true]);

            moveTo(250);
            expect(panel.style.width).toBe("250px");
        });

        it("opens a collapsed panel straight to the pointer when one move passes the minimum", () => {
            const { resizer, panel, handle, visibilityChanges } = setUp({ collapsed: true });

            pressAt(resizer, 500);
            moveTo(250);

            expect(handle.isVisible()).toBe(true);
            expect(panel.style.width).toBe("250px");
            expect(visibilityChanges).toEqual([true]);
        });

        it("ignores dragging a collapsed panel further closed", () => {
            const { resizer, handle, visibilityChanges } = setUp({ collapsed: true });

            pressAt(resizer, 500);
            moveTo(600);

            expect(handle.isVisible()).toBe(false);
            expect(visibilityChanges).toEqual([]);
        });
    });
});
