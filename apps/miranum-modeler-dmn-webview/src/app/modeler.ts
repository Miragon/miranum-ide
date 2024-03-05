import DmnModeler, { DiagramWarning } from "dmn-js/lib/Modeler";
import {
    CamundaPropertiesProviderModule,
    DmnPropertiesPanelModule,
    DmnPropertiesProviderModule,
} from "dmn-js-properties-panel";
import camundaModdleDescriptors from "camunda-dmn-moddle/resources/camunda.json";

import { NoModelerError } from "@miranum-ide/vscode/miranum-vscode-webview";

let modeler: DmnModeler | undefined;

export function createModeler(): DmnModeler {
    modeler = new DmnModeler({
        drd: {
            propertiesPanel: {
                parent: "#js-properties-panel",
            },
            additionalModules: [
                DmnPropertiesPanelModule,
                DmnPropertiesProviderModule,
                CamundaPropertiesProviderModule,
            ],
        },
        common: {
            expressionLanguages: {
                options: [
                    {
                        value: "feel",
                        label: "FEEL",
                    },
                    {
                        value: "juel",
                        label: "JUEL",
                    },
                    {
                        value: "javascript",
                        label: "JavaScript",
                    },
                    {
                        value: "groovy",
                        label: "Groovy",
                    },
                    {
                        value: "python",
                        label: "Python",
                    },
                    {
                        value: "jruby",
                        label: "JRuby",
                    },
                ],
                defaults: {
                    editor: "feel",
                },
            },
            dataTypes: ["string", "boolean", "integer", "long", "double", "date"],
        },
        container: "#js-canvas",
        keyboard: {
            bindTo: document,
        },
        moddleExtensions: {
            camunda: camundaModdleDescriptors,
        },
    });

    return modeler;
}

/**
 * Create a new diagram.
 * @returns ImportWarning with warnings if any
 * @throws NoModelerError if the modeler is not initialized
 */
export async function newDiagram(): Promise<DiagramWarning> {
    return loadDiagram(EMPTY_DIAGRAM_XML);
}

/**
 * Load the diagram from the given XML content.
 * @param dmn
 * @returns ImportWarning with warnings if any
 * @throws NoModelerError if the modeler is not initialized
 */
export async function loadDiagram(dmn: string): Promise<DiagramWarning> {
    try {
        const m = getModeler();
        return await m.importXML(dmn);
    } catch (error) {
        if ((error as DiagramWarning).warnings) {
            const diagramWarning: DiagramWarning = error as DiagramWarning;
            let errorMsg = "";
            diagramWarning.warnings.forEach((warning) => {
                errorMsg += `${warning.message}\n${warning.error.message}\n${warning.error.stack}\n`;
            });
            throw new Error(errorMsg);
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
    const result = await m.saveXML({ format: true });
    if (result.xml) {
        return result.xml;
    }

    throw Error("Failed to save changes made to the diagram!");
}

export function onCommandStackChanged(cb: () => void): void {
    const m = getModeler();
    m.on("views.changed", () => {
        const activeEditor = getModeler().getActiveViewer();
        activeEditor.get("eventBus").on("commandStack.changed", cb);
    });
}

/**
 * Get the modeler instance.
 * @throws NoModelerError if the modeler is not initialized
 */
function getModeler(): DmnModeler {
    if (!modeler) {
        throw new NoModelerError();
    }

    return modeler;
}

const EMPTY_DIAGRAM_XML = `
    <?xml version="1.0" encoding="UTF-8"?>
    <definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" id="Definitions_1y42u6n" name="DRD" namespace="http://camunda.org/schema/1.0/dmn" xmlns:modeler="http://camunda.org/schema/modeler/1.0" exporter="Camunda Modeler" exporterVersion="5.8.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="7.18.0">
      <decision id="Decision_16wqg49" name="Decision 1">
        <decisionTable id="DecisionTable_1wi1sbd">
          <input id="Input_1">
            <inputExpression id="InputExpression_1" typeRef="string">
              <text></text>
            </inputExpression>
          </input>
          <output id="Output_1" typeRef="string" />
        </decisionTable>
      </decision>
      <dmndi:DMNDI>
        <dmndi:DMNDiagram>
          <dmndi:DMNShape dmnElementRef="Decision_16wqg49">
            <dc:Bounds height="80" width="180" x="160" y="100" />
          </dmndi:DMNShape>
        </dmndi:DMNDiagram>
      </dmndi:DMNDI>
    </definitions>
    `;
