import Modeler from "camunda-bpmn-js/lib/base/Modeler";
import BpmnModeler7 from "camunda-bpmn-js/lib/camunda-platform/Modeler";
import BpmnModeler8 from "camunda-bpmn-js/lib/camunda-cloud/Modeler";
import { ImportXMLError, ImportXMLResult, SaveXMLResult } from "bpmn-js/lib/BaseViewer";
import TokenSimulationModule from "bpmn-js-token-simulation";
import ElementTemplateChooserModule from "@bpmn-io/element-template-chooser";
import { ExtendElementTemplates } from "@miranum-ide/miranum-create-append-c7-element-templates";
import { CreateAppendElementTemplatesModule } from "bpmn-js-create-append-anything";
import miragonProviderModule from "./PropertieProvider/provider";
import { setFormKeys } from "./formKeys";

let modeler: Modeler | undefined;

function getModeler(): Modeler {
    if (!modeler) {
        throw new NoModelerError();
    }

    return modeler;
}

export function createModeler(engine: "c7" | "c8"): Modeler {
    const commonModules = [TokenSimulationModule, ElementTemplateChooserModule];

    switch (engine) {
        case "c7": {
            modeler = new BpmnModeler7({
                container: "#js-canvas",
                propertiesPanel: {
                    parent: "#js-properties-panel",
                },
                alignToOrigin: {
                    alignOnSave: false,
                    offset: 150,
                    tolerance: 50,
                },
                additionalModules: [
                    ...commonModules,
                    ExtendElementTemplates,
                    CreateAppendElementTemplatesModule,
                    miragonProviderModule,
                ],
            });
            break;
        }
        case "c8": {
            modeler = new BpmnModeler8({
                container: "#js-canvas",
                alignToOrigin: {
                    alignOnSave: false,
                    offset: 150,
                    tolerance: 50,
                },
                propertiesPanel: {
                    parent: "#js-properties-panel",
                },
                additionalModules: [...commonModules],
            });
            break;
        }
        default: {
            throw Error(`Unsupported engine: ${engine}`);
        }
    }

    return modeler;
}

export function onElementTemplatesErrors(cb: (errors: any) => void): void {
    const m = getModeler();
    m.on("elementTemplates.errors", (event: any) => {
        const { errors } = event;
        cb(errors);
    });
}

export function onCommandStackChanged(cb: () => void): void {
    const m = getModeler();
    m.get<any>("eventBus").on("commandStack.changed", cb);
}

export async function newDiagram(): Promise<ImportXMLResult> {
    const m = getModeler();
    return m.createDiagram();
}

export async function loadDiagram(bpmn: string): Promise<ImportXMLResult> {
    const m = getModeler();
    try {
        return await m.importXML(bpmn);
    } catch (error: unknown) {
        if ((error as ImportXMLError).warnings) {
            const importError: ImportXMLError = error as ImportXMLError;
            const { message, warnings } = importError;
            throw Error(`${message} ${warnings}`);
        } else {
            throw error;
        }
    }
}

export async function exportDiagram(): Promise<string> {
    const m = getModeler();
    const result: SaveXMLResult = await m.saveXML({ format: true });
    if (result.xml) {
        return result.xml;
    } else if (result.error) {
        throw result.error;
    }

    throw Error("Failed to save changes made to the diagram!");
}

export function setElementTemplates(templates: JSON[] | undefined): void {
    if (!templates) {
        return;
    } else if (!modeler) {
        throw new NoModelerError();
    }

    const m = getModeler();
    m.get<any>("elementTemplatesLoader").setTemplates(templates);
}

export function setForms(formKeys: string[] | undefined): void {
    if (!formKeys) {
        return;
    } else if (!modeler) {
        throw new NoModelerError();
    }

    setFormKeys(formKeys);
}

export function alignElementsToOrigin(): void {
    const m = getModeler();
    m.get<any>("alignToOrigin").align();
}

export class NoModelerError extends Error {
    constructor() {
        super("Modeler is not initialized!");
    }
}

export class UnsupportedEngineError extends Error {
    constructor(engine: string) {
        super(`Unsupported engine: ${engine}`);
    }
}
