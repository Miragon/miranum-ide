import { getBusinessObject, is } from "bpmn-js/lib/util/ModelUtil";
import type { DefinitionKind, ModelDefinition } from "@miragon/bpmn-modeler-types";

const ROOT_ELEMENT_TYPE: Record<DefinitionKind, string> = {
    message: "bpmn:Message",
    signal: "bpmn:Signal",
    error: "bpmn:Error",
    escalation: "bpmn:Escalation",
};

const EVENT_DEFINITION_TYPE: Record<DefinitionKind, string> = {
    message: "bpmn:MessageEventDefinition",
    signal: "bpmn:SignalEventDefinition",
    error: "bpmn:ErrorEventDefinition",
    escalation: "bpmn:EscalationEventDefinition",
};

const CODE_PROPERTY: Partial<Record<DefinitionKind, string>> = {
    error: "errorCode",
    escalation: "escalationCode",
};

interface ModdleElement {
    $parent?: ModdleElement;
    get(property: string): unknown;
}

export interface LinkServices {
    readonly bpmnFactory: {
        create(type: string, properties: Record<string, unknown>): ModdleElement;
    };
    readonly commandStack: { execute(command: string, context: unknown): void };
}

/**
 * Points the element's `<kind>Ref` at a local copy of a definition found in
 * another model — reusing an equal one when the model already has it — so the
 * saved file never references another file. One command, so one undo.
 */
export function linkDefinition(
    element: unknown,
    definition: ModelDefinition,
    { bpmnFactory, commandStack }: LinkServices,
): void {
    const { kind } = definition;
    const holder = findReferenceHolder(element, kind);
    const definitions = holder && findDefinitions(holder);
    if (!holder || !definitions) {
        return;
    }

    const commands: unknown[] = [];
    let rootElement = findEqualRootElement(definitions, definition);
    if (!rootElement) {
        rootElement = bpmnFactory.create(ROOT_ELEMENT_TYPE[kind], definitionProperties(definition));
        rootElement.$parent = definitions;
        commands.push({
            cmd: "element.updateModdleProperties",
            context: {
                element,
                moddleElement: definitions,
                properties: { rootElements: [...rootElementsOf(definitions), rootElement] },
            },
        });
    }
    commands.push({
        cmd: "element.updateModdleProperties",
        context: { element, moddleElement: holder, properties: { [`${kind}Ref`]: rootElement } },
    });

    commandStack.execute("properties-panel.multi-command-executor", commands);
}

function findReferenceHolder(element: unknown, kind: DefinitionKind): ModdleElement | undefined {
    const businessObject = getBusinessObject(element) as ModdleElement | undefined;
    if (kind === "message" && (is(element, "bpmn:ReceiveTask") || is(element, "bpmn:SendTask"))) {
        return businessObject;
    }
    const eventDefinitions = (businessObject?.get("eventDefinitions") ?? []) as ModdleElement[];
    return eventDefinitions.find((eventDefinition) =>
        is(eventDefinition, EVENT_DEFINITION_TYPE[kind]),
    );
}

function findDefinitions(moddleElement: ModdleElement): ModdleElement | undefined {
    let current: ModdleElement | undefined = moddleElement;
    while (current && !is(current, "bpmn:Definitions")) {
        current = current.$parent;
    }
    return current;
}

function rootElementsOf(definitions: ModdleElement): ModdleElement[] {
    return (definitions.get("rootElements") ?? []) as ModdleElement[];
}

function findEqualRootElement(
    definitions: ModdleElement,
    definition: ModelDefinition,
): ModdleElement | undefined {
    const codeProperty = CODE_PROPERTY[definition.kind];
    return rootElementsOf(definitions).find(
        (rootElement) =>
            is(rootElement, ROOT_ELEMENT_TYPE[definition.kind]) &&
            (rootElement.get("name") || undefined) === definition.name &&
            (!codeProperty || (rootElement.get(codeProperty) || undefined) === definition.code),
    );
}

function definitionProperties(definition: ModelDefinition): Record<string, unknown> {
    const codeProperty = CODE_PROPERTY[definition.kind];
    return {
        ...(definition.name && { name: definition.name }),
        ...(codeProperty && definition.code && { [codeProperty]: definition.code }),
    };
}
