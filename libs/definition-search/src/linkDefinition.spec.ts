import * as bpmnModdle from "bpmn-moddle";
import { describe, expect, it } from "vitest";

import { linkDefinition, type LinkServices } from "./linkDefinition";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
  <bpmn:process id="p">
    <bpmn:intermediateCatchEvent id="Catch"><bpmn:messageEventDefinition id="MED" /></bpmn:intermediateCatchEvent>
    <bpmn:receiveTask id="Wait" />
    <bpmn:boundaryEvent id="Boundary" attachedToRef="Wait"><bpmn:errorEventDefinition id="EED" /></bpmn:boundaryEvent>
  </bpmn:process>
  <bpmn:message id="Message_Existing" name="paid" />
  <bpmn:error id="Error_Existing" name="Payment failed" errorCode="OTHER" />
</bpmn:definitions>`;

interface ModdleObject {
    $type: string;
    $parent?: ModdleObject;
    get(property: string): ModdleObject & ModdleObject[];
    set(property: string, value: unknown): void;
}

interface Moddle {
    fromXML(
        xml: string,
    ): Promise<{ rootElement: ModdleObject; elementsById: Record<string, ModdleObject> }>;
    create(type: string, properties: Record<string, unknown>): ModdleObject;
}

interface Update {
    moddleElement: ModdleObject;
    properties: Record<string, unknown>;
}

async function setup() {
    const { BpmnModdle } = bpmnModdle as unknown as { BpmnModdle: new () => Moddle };
    const moddle = new BpmnModdle();
    const { rootElement: definitions, elementsById } = await moddle.fromXML(XML);
    let nextId = 0;
    const executed: string[] = [];
    const services: LinkServices = {
        bpmnFactory: {
            create: (type, properties) =>
                moddle.create(type, { id: `Created_${++nextId}`, ...properties }),
        },
        commandStack: {
            execute: (command, commands) => {
                executed.push(command);
                for (const { context } of commands as { context: Update }[]) {
                    for (const [property, value] of Object.entries(context.properties)) {
                        context.moddleElement.set(property, value);
                    }
                }
            },
        },
    };
    const shape = (id: string) => ({ id, businessObject: elementsById[id] });
    return { definitions, elementsById, services, shape, executed };
}

describe("linkDefinition", () => {
    it("reuses an equally named local message", async () => {
        const { definitions, elementsById, services, shape } = await setup();

        linkDefinition(shape("Catch"), { kind: "message", name: "paid", usages: [] }, services);

        expect(elementsById.MED.get("messageRef")).toBe(elementsById.Message_Existing);
        expect(definitions.get("rootElements")).toHaveLength(3);
    });

    it("creates a local copy when no equal definition exists, in one command", async () => {
        const { definitions, elementsById, services, shape, executed } = await setup();

        linkDefinition(shape("Wait"), { kind: "message", name: "shipped", usages: [] }, services);

        const message = elementsById.Wait.get("messageRef");
        expect(message.$type).toBe("bpmn:Message");
        expect(message.get("name")).toBe("shipped");
        expect(message.$parent).toBe(definitions);
        expect(definitions.get("rootElements")).toContain(message);
        expect(executed).toEqual(["properties-panel.multi-command-executor"]);
    });

    it("treats an error with a different code as a different definition", async () => {
        const { elementsById, services, shape } = await setup();

        linkDefinition(
            shape("Boundary"),
            { kind: "error", name: "Payment failed", code: "PAYMENT_FAILED", usages: [] },
            services,
        );

        const error = elementsById.EED.get("errorRef");
        expect(error).not.toBe(elementsById.Error_Existing);
        expect(error.get("errorCode")).toBe("PAYMENT_FAILED");
    });

    it("does nothing when the element cannot hold the reference", async () => {
        const { services, shape, executed } = await setup();

        linkDefinition(shape("Catch"), { kind: "signal", name: "stock", usages: [] }, services);

        expect(executed).toEqual([]);
    });
});
