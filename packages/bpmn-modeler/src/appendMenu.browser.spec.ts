import type { Shape } from "bpmn-js/lib/model/Types";
import {
    ALL_EVENTS,
    DATA_OBJECTS,
    GATEWAY,
    PARTICIPANT,
    SUBPROCESS,
    TASK,
} from "bpmn-js-create-append-anything";
import { afterEach, describe, expect, it } from "vitest";

import { PLAIN_ENTRY_ACTION_BY_BPMN_TYPE } from "@miragon/bpmn-modeler-append-menu";

import { createModeler } from "./createModeler";
import type { BpmnModeler } from "./modeler";

interface PopupMenuService {
    open(target: unknown, providerId: string, position: { x: number; y: number }): void;
    close(): void;
}

const UPSTREAM_OPTIONS = [
    ...TASK,
    ...GATEWAY,
    ...SUBPROCESS,
    ...ALL_EVENTS,
    ...DATA_OBJECTS,
    ...PARTICIPANT,
];

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:task id="Task_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="200" y="200" width="100" height="80" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const TASK_OR_USER_TASK_TEMPLATE = {
    $schema: "https://unpkg.com/@camunda/element-templates-json-schema/resources/schema.json",
    id: "task-or-user-task",
    name: "Task or user task",
    appliesTo: ["bpmn:Task", "bpmn:UserTask"],
    properties: [],
};

const handles: BpmnModeler[] = [];
const mountedNodes: HTMLElement[] = [];

afterEach(() => {
    handles.forEach((handle) => handle.destroy());
    handles.length = 0;
    mountedNodes.forEach((node) => node.remove());
    mountedNodes.length = 0;
    document.querySelectorAll(".am-overlay-root").forEach((root) => root.remove());
});

// Preact runs the properties panel's mount effects a frame plus a task after import; tearing
// the modeler down before then trips the panel's selection reconcile on a destroyed canvas.
async function afterPaint(): Promise<void> {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve));
}

async function openAppendMenu(
    options: Pick<Parameters<typeof createModeler>[1], "locale" | "settings" | "elementTemplates">,
): Promise<BpmnModeler> {
    const container = document.createElement("div");
    const panel = document.createElement("div");
    container.style.cssText = "position:absolute;width:1200px;height:800px";
    document.body.append(container, panel);
    mountedNodes.push(container, panel);
    const handle = await createModeler(container, {
        engine: "c7",
        propertiesPanel: { parent: panel },
        ...options,
    });
    handles.push(handle);
    await handle.loadDiagram(XML);
    await afterPaint();
    const task = handle.getService<{ get(id: string): Shape }>("elementRegistry").get("Task_1");
    handle.getService<PopupMenuService>("popupMenu").open(task, "bpmn-append", { x: 320, y: 200 });
    return handle;
}

function navKeys(selector: string): (string | null)[] {
    return Array.from(document.querySelectorAll(`${selector} .am-bpmn-button`), (button) =>
        button.getAttribute("data-nav-key"),
    );
}

function click(selector: string): void {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) {
        throw new Error(`No element matches ${selector}`);
    }
    element.click();
}

describe("append menu entry catalog", () => {
    it.each(Object.entries(PLAIN_ENTRY_ACTION_BY_BPMN_TYPE))(
        "maps %s to the upstream entry creating its plain element",
        (bpmnType, action) => {
            const option = UPSTREAM_OPTIONS.find((candidate) => candidate.actionName === action);

            expect(option?.target.type).toBe(bpmnType);
            expect(option?.target.eventDefinitionType).toBeUndefined();
            expect(option?.target.triggeredByEvent).toBeUndefined();
        },
    );

    it("covers every type upstream offers a plain entry for", () => {
        const plainUpstreamTypes = UPSTREAM_OPTIONS.filter(
            ({ target }) => !target.eventDefinitionType && !target.triggeredByEvent,
        ).map(({ target }) => target.type);

        expect(new Set(plainUpstreamTypes)).toEqual(
            new Set(Object.keys(PLAIN_ENTRY_ACTION_BY_BPMN_TYPE)),
        );
    });
});

describe("append menu", () => {
    it("pins favourites by BPMN type in a translated UI", async () => {
        await openAppendMenu({
            locale: "de",
            settings: {
                favouriteBpmnElements: [
                    "bpmn:BusinessRuleTask",
                    "bpmn:IntermediateThrowEvent",
                    "bpmn:SubProcess",
                    "bpmn:UserTask",
                ],
            },
        });

        expect(navKeys(".am-bpmn-group--favourites")).toEqual([
            "fav:append-rule-task",
            "fav:append-none-intermediate-throwing",
            "fav:append-collapsed-subprocess",
            "fav:append-user-task",
        ]);
        expect(
            document.querySelector('[data-nav-key="fav:append-rule-task"]')?.getAttribute("title"),
        ).toBe("Regel Aufgabe");
    });

    it("offers a multi-type template only the types it applies to and creates the pick", async () => {
        const handle = await openAppendMenu({ elementTemplates: [TASK_OR_USER_TASK_TEMPLATE] });

        click(".am-template-card");

        await expect
            .poll(() => navKeys(".am-bpmn-group"))
            .toEqual(["grp:tasks:append-task", "grp:tasks:append-user-task"]);

        click('[data-nav-key="grp:tasks:append-user-task"]');

        const created = handle
            .getService<{ filter(predicate: (shape: Shape) => boolean): Shape[] }>(
                "elementRegistry",
            )
            .filter((shape) => shape.id !== "Task_1" && shape.type === "bpmn:UserTask");
        expect(created).toHaveLength(1);
        expect(created[0].businessObject.get("camunda:modelerTemplate")).toBe(
            TASK_OR_USER_TASK_TEMPLATE.id,
        );
    });
});
