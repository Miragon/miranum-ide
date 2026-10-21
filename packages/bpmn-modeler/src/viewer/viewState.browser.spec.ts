import { afterEach, describe, expect, it } from "vitest";

import { isUsableViewbox } from "@miragon/bpmn-modeler-types";

import { createViewer } from "./createViewer";
import type { BpmnViewer } from "./viewer";
import type { ViewState } from "../viewState";
import { FAR_FROM_ORIGIN_XML } from "../__fixtures__/bpmnXml";
import { mountCanvas, removeMounts, settleObserver } from "../__fixtures__/surfaceMount";

/**
 * The #1490 view-state contract only reproduces against a real bpmn-js canvas
 * and a real ResizeObserver: an `applyViewState` right after `loadDiagram` must
 * win over the observer's delayed initial fit. jsdom lays nothing out and ships
 * no ResizeObserver, so this runs in Vitest browser mode (headless Chromium).
 */

const SNAPSHOT: ViewState = {
    viewport: { x: 5000, y: 3900, width: 640, height: 480 },
    selectedElementIds: ["Task_1"],
};

let viewer: BpmnViewer | undefined;
let container: HTMLElement | undefined;

function expectViewportMatches(actual: { x: number; y: number; width: number; height: number }) {
    expect(actual.x).toBeCloseTo(SNAPSHOT.viewport.x, 0);
    expect(actual.y).toBeCloseTo(SNAPSHOT.viewport.y, 0);
    expect(actual.width).toBeCloseTo(SNAPSHOT.viewport.width, 0);
    expect(actual.height).toBeCloseTo(SNAPSHOT.viewport.height, 0);
}

afterEach(() => {
    viewer?.destroy();
    viewer = undefined;
    container = undefined;
    removeMounts();
});

describe("BpmnViewer view-state restore (real ResizeObserver)", () => {
    it("keeps a restored viewport across the delayed initial fit (#1490)", async () => {
        container = mountCanvas(800, 600);
        viewer = await createViewer(container);
        await viewer.loadDiagram(FAR_FROM_ORIGIN_XML);

        viewer.applyViewState(SNAPSHOT);
        await settleObserver();

        expectViewportMatches(viewer.viewport.getViewport());
        expect(viewer.selection.getSelectedElementIds()).toEqual(["Task_1"]);
    });

    it("applies the snapshot viewport once a hidden container is sized", async () => {
        container = mountCanvas(0, 0);
        viewer = await createViewer(container);
        await viewer.loadDiagram(FAR_FROM_ORIGIN_XML);

        viewer.applyViewState(SNAPSHOT);
        await settleObserver();

        container.style.width = "800px";
        container.style.height = "600px";
        await settleObserver();

        expectViewportMatches(viewer.viewport.getViewport());
        expect(viewer.selection.getSelectedElementIds()).toEqual(["Task_1"]);
    });

    it("does not re-fit a restored viewport when the container is resized", async () => {
        container = mountCanvas(800, 600);
        viewer = await createViewer(container);
        await viewer.loadDiagram(FAR_FROM_ORIGIN_XML);

        viewer.applyViewState(SNAPSHOT);
        await settleObserver();

        const before = viewer.viewport.getViewport();

        container.style.width = "1000px";
        await settleObserver();

        // Not re-fit: the top-left anchor and zoom are preserved. diagram-js
        // legitimately grows the viewbox width at constant scale as the container
        // widens, so width itself is expected to change — the anchor is what a
        // stray re-fit would move.
        const after = viewer.viewport.getViewport();
        expect(after.x).toBeCloseTo(SNAPSHOT.viewport.x, 0);
        expect(after.y).toBeCloseTo(SNAPSHOT.viewport.y, 0);
        expect(after.scale).toBeCloseTo(before.scale!, 5);
    });

    it("still fits on a fresh open once the container is sized (regression guard)", async () => {
        container = mountCanvas(0, 0);
        viewer = await createViewer(container);
        await viewer.loadDiagram(FAR_FROM_ORIGIN_XML);
        await settleObserver();

        container.style.width = "800px";
        container.style.height = "600px";
        await settleObserver();

        const viewport = viewer.viewport.getViewport();
        expect(isUsableViewbox(viewport)).toBe(true);
        // A fit centred on the diagram (spanning x 5000–5400), not the snapshot
        // box and not the origin — proof the initial fit still runs with no restore.
        expect(viewport.x).toBeGreaterThan(4000);
        expect(viewport.x).toBeLessThan(5400);
        expect(viewport.width).toBeGreaterThan(400);
    });

    it("clears the selection when the snapshot has none", async () => {
        container = mountCanvas(800, 600);
        viewer = await createViewer(container);
        await viewer.loadDiagram(FAR_FROM_ORIGIN_XML);

        viewer.selection.selectElementsByIds(["Task_1", "Task_2"]);
        expect(viewer.selection.getSelectedElementIds()).toHaveLength(2);

        viewer.applyViewState({ viewport: SNAPSHOT.viewport, selectedElementIds: [] });
        await settleObserver();

        expect(viewer.selection.getSelectedElementIds()).toEqual([]);
    });
});
