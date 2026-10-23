const EDGE_GAP = 8;
// Keep in sync with the `.am-hover-card` width.
const HOVER_CARD_WIDTH = 300;
const HOVER_CARD_MIN_HEIGHT = 200;

export interface CanvasBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

interface PanelPosition {
    left: number;
    top: number;
}

export interface HoverCardPosition {
    top: number;
    left: number;
    maxHeight: number;
}

/**
 * Clamps the panel to the canvas container rather than the viewport so it
 * never overlaps the properties panel docked to the right of the canvas.
 */
export function clampToCanvas(
    anchor: { x: number; y: number },
    panelSize: { width: number; height: number },
    canvasBounds: CanvasBounds,
): PanelPosition {
    return {
        left: clampToCanvasAxis(anchor.x, panelSize.width, canvasBounds.left, canvasBounds.right),
        top: clampToCanvasAxis(anchor.y, panelSize.height, canvasBounds.top, canvasBounds.bottom),
    };
}

// A panel larger than the canvas overhangs the canvas's start edge, never the viewport's.
function clampToCanvasAxis(
    anchor: number,
    panelExtent: number,
    canvasStart: number,
    canvasEnd: number,
): number {
    const min = canvasStart + EDGE_GAP;
    const max = canvasEnd - panelExtent - EDGE_GAP;
    return max < min ? Math.max(EDGE_GAP, max) : Math.min(Math.max(anchor, min), max);
}

/**
 * Opens the hover card to the left of the panel so it clears both the template
 * list and the BPMN palette. When the panel sits hard against the left edge the
 * card is clamped on-screen and may then touch the panel.
 */
export function hoverCardPosition(
    anchor: { panelLeft: number; cardTop: number },
    viewportHeight: number,
): HoverCardPosition {
    const left = Math.max(EDGE_GAP, anchor.panelLeft - HOVER_CARD_WIDTH - EDGE_GAP);
    const top = Math.max(
        EDGE_GAP,
        Math.min(anchor.cardTop, viewportHeight - HOVER_CARD_MIN_HEIGHT),
    );
    const maxHeight = viewportHeight - top - EDGE_GAP;

    return { top, left, maxHeight };
}
