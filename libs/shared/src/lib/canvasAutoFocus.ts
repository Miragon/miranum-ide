export interface CanvasAutoFocusOptions {
    focusCanvas: () => void;
    schedule?: (callback: () => void) => void;
}

function isNothingFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement === null || activeElement === document.body;
}

// diagram-js only receives shortcuts on the canvas SVG, but a re-created webview starts with
// focus on <body>. Never steal focus from an element the user (or a restore) already focused.
export function installCanvasAutoFocus(options: CanvasAutoFocusOptions): () => void {
    const schedule = options.schedule ?? requestAnimationFrame;

    // Deferred so a click that focuses the window lands its own focus first.
    const scheduleFocusIfNothingFocused = (): void =>
        schedule(() => {
            if (isNothingFocused()) {
                options.focusCanvas();
            }
        });

    window.addEventListener("focus", scheduleFocusIfNothingFocused);

    // The host may have focused the window before this listener existed.
    if (document.hasFocus()) {
        scheduleFocusIfNothingFocused();
    }

    return () => window.removeEventListener("focus", scheduleFocusIfNothingFocused);
}

// Programmatic focus inside the frame also moves the host's focus into it, which is what the
// window "focus" path cannot do when the host's own focus attempt never reached the frame.
export function takeFocus(focusCanvas: () => void): void {
    const activeElement = document.activeElement;
    if (isNothingFocused()) {
        focusCanvas();
    } else if (activeElement instanceof HTMLElement || activeElement instanceof SVGElement) {
        activeElement.focus();
    }
}
