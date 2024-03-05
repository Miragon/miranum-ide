import Modeler from "camunda-bpmn-js/lib/base/Modeler";
import BpmnModeler7 from "camunda-bpmn-js/lib/camunda-platform/Modeler";
import BpmnModeler8 from "camunda-bpmn-js/lib/camunda-cloud/Modeler";
import { ImportXMLError, ImportXMLResult, SaveXMLResult } from "bpmn-js/lib/BaseViewer";
import TokenSimulationModule from "bpmn-js-token-simulation";
import ElementTemplateChooserModule from "@bpmn-io/element-template-chooser";
import { CreateAppendElementTemplatesModule } from "bpmn-js-create-append-anything";

import { ExtendElementTemplates } from "@miranum-ide/miranum-create-append-c7-element-templates";
import { NoModelerError } from "@miranum-ide/vscode/miranum-vscode-webview";

import miragonProviderModule from "./PropertieProvider/provider";
import { setFormKeys } from "./formKeys";

let modeler: Modeler | undefined;

/**
 * Get the modeler instance.
 * @throws NoModelerError if the modeler is not initialized
 */
function getModeler(): Modeler {
    if (!modeler) {
        throw new NoModelerError();
    }

    return modeler;
}

/**
 * Create a new modeler instance.
 * @param engine
 * @throws UnsupportedEngineError if the engine is not supported
 */
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
            throw new UnsupportedEngineError(engine);
        }
    }

    return modeler;
}

/**
 * Subscribe to the `elementTemplates.errors` event.
 * @param cb
 * @throws NoModelerError if the modeler is not initialized
 */
export function onElementTemplatesErrors(cb: (errors: any) => void): void {
    const m = getModeler();
    m.on("elementTemplates.errors", (event: any) => {
        const { errors } = event;
        cb(errors);
    });
}

/**
 * Subscribe to the `commandStack.changed` event from the `eventBus`.
 * @param cb
 * @throws NoModelerError if the modeler is not initialized
 */
export function onCommandStackChanged(cb: () => void): void {
    const m = getModeler();
    m.get<any>("eventBus").on("commandStack.changed", cb);
}

/**
 * Create a new diagram.
 * @return ImportXMLResult with warnings if any
 * @throws NoModelerError if the modeler is not initialized
 */
export async function newDiagram(): Promise<ImportXMLResult> {
    const m = getModeler();
    return m.createDiagram();
}

/**
 * Load the diagram from the given XML content.
 * @param bpmn
 * @return ImportXMLResult with warnings if any
 * @throws NoModelerError if the modeler is not initialized
 */
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

/**
 * Get the XML content of the current diagram.
 * @return the XML content
 * @throws NoModelerError if the modeler is not initialized
 * @throws Error if something went wrong
 */
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

/**
 * Set the element templates to the modeler.
 * @param templates
 * @throws NoModelerError if the modeler is not initialized
 */
export function setElementTemplates(templates: JSON[] | undefined): void {
    if (!templates) {
        return;
    }

    const m = getModeler();
    m.get<any>("elementTemplatesLoader").setTemplates(templates);
}

/**
 * Set the form keys to the modeler.
 * @param formKeys
 * @throws NoModelerError if the modeler is not initialized
 */
export function setForms(formKeys: string[] | undefined): void {
    if (!formKeys) {
        return;
    } else if (!modeler) {
        throw new NoModelerError();
    }

    setFormKeys(formKeys);
}

/**
 * Align the elements to the origin.
 * @throws NoModelerError if the modeler is not initialized
 */
export function alignElementsToOrigin(): void {
    const m = getModeler();
    m.get<any>("alignToOrigin").align();
}

export class UnsupportedEngineError extends Error {
    constructor(engine: string) {
        super(`Unsupported engine: ${engine}`);
    }
}
