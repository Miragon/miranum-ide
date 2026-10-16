// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installCanvasAutoFocus, takeFocus } from "./canvasAutoFocus";

describe("installCanvasAutoFocus", () => {
    const focusCanvas = vi.fn();
    let scheduledCallbacks: Array<() => void>;
    let dispose: (() => void) | undefined;

    const schedule = (callback: () => void): void => {
        scheduledCallbacks.push(callback);
    };
    const runScheduled = (): void => {
        scheduledCallbacks.splice(0).forEach((callback) => callback());
    };
    const install = (): void => {
        dispose = installCanvasAutoFocus({ focusCanvas, schedule });
    };

    function focusNewInput(): HTMLInputElement {
        const input = document.createElement("input");
        document.body.append(input);
        input.focus();
        return input;
    }

    beforeEach(() => {
        scheduledCallbacks = [];
        focusCanvas.mockReset();
        vi.spyOn(document, "hasFocus").mockReturnValue(false);
    });

    afterEach(() => {
        dispose?.();
        dispose = undefined;
        document.body.replaceChildren();
        vi.restoreAllMocks();
    });

    it("focuses the canvas when the window gains focus with nothing focused", () => {
        install();

        window.dispatchEvent(new FocusEvent("focus"));
        runScheduled();

        expect(focusCanvas).toHaveBeenCalledOnce();
    });

    it("keeps focus on an already focused input", () => {
        install();
        focusNewInput();

        window.dispatchEvent(new FocusEvent("focus"));
        runScheduled();

        expect(focusCanvas).not.toHaveBeenCalled();
    });

    it("keeps focus that lands between the window focus and the scheduled check", () => {
        install();

        window.dispatchEvent(new FocusEvent("focus"));
        focusNewInput();
        runScheduled();

        expect(focusCanvas).not.toHaveBeenCalled();
    });

    it("focuses the canvas on install when the document already has focus", () => {
        vi.mocked(document.hasFocus).mockReturnValue(true);

        install();
        runScheduled();

        expect(focusCanvas).toHaveBeenCalledOnce();
    });

    it("does not focus the canvas on install when the document has no focus", () => {
        install();
        runScheduled();

        expect(focusCanvas).not.toHaveBeenCalled();
    });

    it("stops reacting to window focus after dispose", () => {
        install();
        dispose?.();

        window.dispatchEvent(new FocusEvent("focus"));
        runScheduled();

        expect(focusCanvas).not.toHaveBeenCalled();
    });
});

describe("takeFocus", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it("focuses the canvas when nothing in the page is focused", () => {
        const focusCanvas = vi.fn();

        takeFocus(focusCanvas);

        expect(focusCanvas).toHaveBeenCalledOnce();
    });

    it("re-focuses the element the user left focused instead of the canvas", () => {
        const focusCanvas = vi.fn();
        const input = document.createElement("input");
        document.body.append(input);
        input.focus();
        const focusSpy = vi.spyOn(input, "focus");

        takeFocus(focusCanvas);

        expect(focusSpy).toHaveBeenCalledOnce();
        expect(focusCanvas).not.toHaveBeenCalled();
    });
});
