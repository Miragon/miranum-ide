import type Modeling from "bpmn-js/lib/features/modeling/Modeling";
import type EventBus from "diagram-js/lib/core/EventBus";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MESSY_LANES_BOUNDARY_SUBPROCESS } from "../../../libs/bpmn-layout/src/__fixtures__/integrationDiagrams";
import { DIAGRAM_WITH_REAL_GARBAGE } from "../../../libs/bpmn-layout/src/cleanup/__fixtures__/models";
import * as lintModule from "./bpmnlint/index";
import { createModeler } from "./createModeler";
import { createDesigner } from "./design/createDesigner";
import type { BpmnDesignerHandle, DesignerOptions } from "./design/publicApi";
import { FAR_FROM_ORIGIN_XML } from "./__fixtures__/bpmnXml";
import { mountWithPanel, removeMounts, type SurfaceMount } from "./__fixtures__/surfaceMount";

/**
 * The host-command contract the modeler and the designer implement separately
 * (export, format, cleanup, import errors, lint pushes, debounced save). Both
 * run the real bpmn-js modeling stack, so the contract runs in the browser
 * project against each surface.
 */

type SharedOptions = Pick<DesignerOptions, "linting" | "onContentSaved">;

type LabelTarget = Parameters<Modeling["updateLabel"]>[0];

interface EditableSurfaceDescriptor {
    name: string;
    create(mount: SurfaceMount, options: SharedOptions): Promise<BpmnDesignerHandle>;
}

const EDITABLE_SURFACES: EditableSurfaceDescriptor[] = [
    {
        name: "modeler",
        create: ({ container, panel }, options) =>
            createModeler(container, {
                engine: "c8",
                propertiesPanel: { parent: panel },
                ...options,
            }),
    },
    {
        name: "designer",
        create: ({ container, panel }, options) =>
            createDesigner(container, { propertiesPanel: { parent: panel }, ...options }),
    },
];

const LINT_RESULTS = {
    "label-required": [
        { id: "StartEvent_1", message: "Element is missing label/name", category: "warn" },
    ],
};

function lintCompleted(surface: BpmnDesignerHandle): Promise<void> {
    return new Promise((resolve) =>
        surface.getService<EventBus>("eventBus").once("linting.completed", () => resolve()),
    );
}

describe.each(EDITABLE_SURFACES)("$name editable-surface contract", (descriptor) => {
    let surface: BpmnDesignerHandle | undefined;

    async function open(options: SharedOptions = { linting: false }): Promise<BpmnDesignerHandle> {
        surface = await descriptor.create(mountWithPanel(), options);
        return surface;
    }

    afterEach(() => {
        surface?.destroy();
        surface = undefined;
        removeMounts();
    });

    it("exports the rendered diagram as SVG", async () => {
        const handle = await open();
        await handle.loadDiagram(FAR_FROM_ORIGIN_XML);

        const svg = await handle.getDiagramSvg();

        expect(svg).toMatch(/^<\?xml[\s\S]*<svg/);
        expect(svg).toContain('data-element-id="Task_1"');
    });

    it("formats the diagram as a single undoable step", async () => {
        const handle = await open();
        await handle.loadDiagram(MESSY_LANES_BOUNDARY_SUBPROCESS);
        const commandStack = handle.getService("commandStack");

        const outcome = await handle.formatDiagram();

        expect(outcome.status).toBe("formatted");
        commandStack.undo();
        expect(commandStack.canUndo()).toBe(false);
    });

    it("reports diagram garbage, removes it on apply, and then reads clean", async () => {
        const handle = await open();
        await handle.loadDiagram(DIAGRAM_WITH_REAL_GARBAGE);

        const report = handle.cleanupDiagram();
        expect(report.status).toBe("reported");
        expect(report.items.length).toBeGreaterThan(0);

        expect(handle.cleanupDiagram({ apply: true }).status).toBe("applied");
        expect(handle.cleanupDiagram().items).toEqual([]);
    });

    it("rejects an unparsable import with the parser warnings as the cause", async () => {
        const handle = await open();

        const rejection = await handle.loadDiagram("<not-bpmn/>").catch((error: unknown) => error);

        expect(rejection).toBeInstanceOf(Error);
        expect((rejection as Error).cause).toHaveProperty("warnings", expect.any(Array));
    });

    it("turns host lint pushes into warnings when created without a lint module", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const handle = await open();

        expect(() => handle.applyLintResults(LINT_RESULTS)).not.toThrow();
        expect(() => handle.applyLintingDisabled()).not.toThrow();
        expect(() => handle.startInPageLinting()).not.toThrow();

        expect(warn.mock.calls.map(([message]) => message)).toEqual(
            ["applyLintResults", "applyLintingDisabled", "startInPageLinting"].map(
                (method) => `${method} ignored: this surface was created without a lint module`,
            ),
        );
        warn.mockRestore();
    });

    it("paints host lint pushes and hands linting back to the page", async () => {
        const handle = await open({ linting: { module: lintModule, results: "external" } });
        await handle.loadDiagram(FAR_FROM_ORIGIN_XML);
        const canvasClasses = handle.getService("canvas").getContainer().classList;

        let completed = lintCompleted(handle);
        handle.applyLintResults(LINT_RESULTS);
        await completed;
        expect(canvasClasses.contains("bpmnlint-active")).toBe(true);

        handle.applyLintingDisabled();
        expect(canvasClasses.contains("bpmnlint-active")).toBe(false);
        expect(canvasClasses.contains("bpmnlint-disabled")).toBe(true);

        completed = lintCompleted(handle);
        handle.startInPageLinting();
        await completed;
        expect(canvasClasses.contains("bpmnlint-disabled")).toBe(false);
        expect(canvasClasses.contains("bpmnlint-active")).toBe(true);
    });

    it("saves edits through the debounced content callback", async () => {
        const onContentSaved = vi.fn();
        const handle = await open({ linting: false, onContentSaved });
        await handle.loadDiagram(FAR_FROM_ORIGIN_XML);

        const modeling = handle.getService("modeling");
        const task = handle.getService("elementRegistry").get("Task_1") as LabelTarget;
        modeling.updateLabel(task, "Renamed");

        await vi.waitFor(() => expect(onContentSaved).toHaveBeenCalledOnce());
        expect(onContentSaved.mock.calls[0][0].xml).toContain('name="Renamed"');
    });
});
