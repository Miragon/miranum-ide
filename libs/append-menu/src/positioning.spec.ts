import { describe, expect, it } from "vitest";

import { clampToCanvas, hoverCardPosition } from "./positioning";

describe("clampToCanvas", () => {
    const panel = { width: 300, height: 200 };
    const canvas = { right: 1000, bottom: 800 };

    it.each([
        ["inside the canvas", { x: 100, y: 120 }, { left: 100, top: 120 }],
        ["past the right edge", { x: 900, y: 120 }, { left: 692, top: 120 }],
        ["past the bottom edge", { x: 100, y: 700 }, { left: 100, top: 592 }],
        ["before the top-left corner", { x: -40, y: -10 }, { left: 8, top: 8 }],
    ])("keeps a panel anchored %s on the canvas", (_case, anchor, expected) => {
        expect(clampToCanvas(anchor, panel, canvas)).toEqual(expected);
    });

    it("pins a panel larger than the canvas to the top-left margin", () => {
        expect(clampToCanvas({ x: 50, y: 50 }, { width: 1200, height: 900 }, canvas)).toEqual({
            left: 8,
            top: 8,
        });
    });
});

describe("hoverCardPosition", () => {
    const viewportHeight = 900;

    it("opens left of the panel, aligned with the hovered card", () => {
        expect(hoverCardPosition({ panelLeft: 600, cardTop: 240 }, viewportHeight)).toEqual({
            left: 292,
            top: 240,
            maxHeight: 652,
        });
    });

    it("stays on-screen when the panel sits against the left edge", () => {
        expect(hoverCardPosition({ panelLeft: 100, cardTop: 240 }, viewportHeight).left).toBe(8);
    });

    it.each([
        ["above the viewport", -50, 8],
        ["near the viewport bottom", 850, 700],
    ])("clamps a card scrolled %s", (_case, cardTop, top) => {
        expect(hoverCardPosition({ panelLeft: 600, cardTop }, viewportHeight)).toMatchObject({
            top,
            maxHeight: viewportHeight - top - 8,
        });
    });
});
