import { afterEach, describe, expect, it } from "vitest";

import { createDesigner } from "./createDesigner";
import type { BpmnDesigner } from "./designer";
import { mountWithPanel, removeMounts } from "../__fixtures__/surfaceMount";

/**
 * The designer's runtime contract — editable services present, Camunda
 * services absent, panel rendered. Needs a real bpmn-js instance;
 * the factory's failure paths stay covered by the jsdom
 * `createDesigner.spec.ts`.
 */

let designer: BpmnDesigner | undefined;
afterEach(() => {
    designer?.destroy();
    designer = undefined;
    removeMounts();
});

describe("createDesigner (runtime contract)", () => {
    it("exposes the editable core services (inverse of the viewer's readonly proof)", async () => {
        const { container, panel } = mountWithPanel();
        designer = await createDesigner(container, { propertiesPanel: { parent: panel } });
        // The panel attaches on import, so give it a diagram to render against.
        await designer.newDiagram();

        // Editable: the modelling services a viewer never registers ARE present.
        expect(designer.getService("modeling")).toBeDefined();
        expect(designer.getService("commandStack")).toBeDefined();
        // Engine-neutral: none of the Camunda services are registered.
        expect(() => designer!.getService("elementTemplates")).toThrow();
        expect(() => designer!.getService("transactionBoundaries")).toThrow();
        // The panel renders under the supplied parent.
        expect(panel.querySelector(".bio-properties-panel")).not.toBeNull();

        designer.destroy();
        designer = undefined;
    });
});
