import DmnModeler, { WarningArray } from "bpmn-js/lib/Modeler";

const EMPTY_DIAGRAM_XML =
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
    "<bpmn:definitions xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " +
                      "xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" " +
                      "xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" " +
                      "xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" " +
                      "targetNamespace=\"http://bpmn.io/schema/bpmn\" " +
                      "id=\"Definitions_1\">" +
        "<bpmn:process id=\"Process_1\" isExecutable=\"false\">" +
            "<bpmn:startEvent id=\"StartEvent_1\"/>" +
        "</bpmn:process>" +
        "<bpmndi:BPMNDiagram id=\"BPMNDiagram_1\">" +
            "<bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_1\">" +
                "<bpmndi:BPMNShape id=\"_BPMNShape_StartEvent_2\" bpmnElement=\"StartEvent_1\">" +
                    "<dc:Bounds height=\"36.0\" width=\"36.0\" x=\"173.0\" y=\"102.0\"/>" +
                "</bpmndi:BPMNShape>" +
            "</bpmndi:BPMNPlane>" +
        "</bpmndi:BPMNDiagram>" +
    "</bpmn:definitions>";

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
