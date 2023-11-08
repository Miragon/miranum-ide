import DmnModeler, { WarningArray } from "dmn-js/lib/Modeler";

const EMPTY_DIAGRAM_XML =
    `
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

export class ImportWarning extends Error {
    warnings: WarningArray;

    constructor(msg: string, warnings: WarningArray) {
        super(msg);
        this.warnings = warnings;
    }
}

export class ContentController {

    constructor(
        private readonly modeler: DmnModeler,
    ) {
    }

    public async newDiagram(): Promise<ImportWarning> {
        return this.loadDiagram(EMPTY_DIAGRAM_XML);
    }

    public async loadDiagram(dmn: string): Promise<ImportWarning> {
        try {
            const { warnings } = await this.modeler.importXML(dmn);

            return new ImportWarning("Imported DMN diagram", warnings);

        } catch (error: any) {
            const { warnings } = error;
            if (warnings) {
                throw new ImportWarning("Failed to import DMN diagram", warnings);
            } else {
                const message = (error instanceof Error) ? error.message : "";
                throw new Error(`Failed to import DMN diagram ${message}`);
            }
        }
    }

    public async exportDiagram(): Promise<string> {
        return (await this.modeler.saveXML({ format: true })).xml;
    }
}
