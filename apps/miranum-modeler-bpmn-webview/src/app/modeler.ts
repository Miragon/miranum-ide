import Modeler from "camunda-bpmn-js/lib/base/Modeler";
import { ImportXMLError, ImportXMLResult, SaveXMLResult } from "bpmn-js/lib/BaseViewer";

let modeler: Modeler | undefined;

export function getModeler(): Modeler {
    if (!modeler) {
        throw new Error("Modeler is not initialized!");
    }

    return modeler;
}

export function setModeler(newModeler: Modeler): Modeler {
    modeler = newModeler;
    return modeler;
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

function createBpmnModeler(engine: "c7" | "c8"): Modeler {
    let bpmnModeler;
    const commonModules = [TokenSimulationModule, ElementTemplateChooserModule];

    switch (executionPlatformVersion) {
        case ExecutionPlatformVersion.None:
        case ExecutionPlatformVersion.Camunda7: {
            bpmnModeler = new BpmnModeler7({
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
        case ExecutionPlatformVersion.Camunda8: {
            bpmnModeler = new BpmnModeler8({
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
    }

    return bpmnModeler;
}
