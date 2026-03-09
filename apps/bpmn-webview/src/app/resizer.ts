/** Minimum width (px) the properties panel can be dragged to. */
const MIN_PANEL_WIDTH = 200;
/** Maximum width (px) the properties panel can be dragged to. */
const MAX_PANEL_WIDTH = 1600;

/**
 * Attaches mouse-drag listeners to the `.panel-resizer` element so the user
 * can resize the properties panel by dragging the divider.
 *
 * Dragging left widens the panel; dragging right narrows it.
 * Width is clamped between {@link MIN_PANEL_WIDTH} and {@link MAX_PANEL_WIDTH}.
 *
 * Strategy: track the intended flex-basis in `targetWidth` (initialised once at
 * mousedown from `panel.offsetWidth`) and accumulate incremental deltas on it.
 * `panel.offsetWidth` is never read again during the drag, so the flex layout's
 * computed width cannot create a feedback loop that collapses the panel.
 * `lastX` resets every frame to ensure reversing at a clamp boundary is
 * immediately visible with no dead zone.
 */
export function initResizer(): void {
    const resizer = document.getElementById("js-panel-resizer");
    const panel = document.getElementById("js-properties-panel");

    if (!resizer || !panel) {
        console.warn("[resizer] Required DOM elements not found — skipping resizer init.");
        return;
    }

    let isResizing = false;
    let lastX = 0;
    /** Tracks the intended flex-basis (px) independently of offsetWidth. */
    let targetWidth = 0;

    /**
     * Begin a resize operation: snapshot the panel's current width as the
     * target flex-basis and capture the pointer position as the delta baseline.
     * Reading `offsetWidth` only once here avoids the flex feedback loop during
     * the drag.
     */
    resizer.addEventListener("mousedown", (e: MouseEvent) => {
        isResizing = true;
        lastX = e.clientX;
        // Snapshot once — offsetWidth is never read again while dragging.
        targetWidth = panel.offsetWidth;

        // Prevent text selection while dragging.
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    });

    /**
     * Update the panel width as the pointer moves.
     * Moving left (positive delta) increases the panel width because the panel
     * is on the right side of the canvas.
     *
     * `targetWidth` accumulates the intended width so the flex layout's actual
     * computed width cannot drift the target downward (feedback loop).
     * `lastX` resets every frame so reversing at a clamp boundary takes effect
     * immediately with no dead zone.
     */
    document.addEventListener("mousemove", (e: MouseEvent) => {
        if (!isResizing) {
            return;
        }

        const delta = lastX - e.clientX;
        // Reset baseline each frame — prevents dead-zone accumulation at clamp boundaries.
        lastX = e.clientX;
        targetWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, targetWidth + delta));
        panel.style.width = `${targetWidth}px`;
    });

    /** End the resize operation and restore default pointer behaviour. */
    document.addEventListener("mouseup", () => {
        if (!isResizing) {
            return;
        }

        isResizing = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    });
}
