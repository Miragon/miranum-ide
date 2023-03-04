import BpmnModeler, { WarningArray } from "bpmn-js/lib/Modeler";
import { FolderContent } from "../types/VsCode";

const EMPTY_DIAGRAM_XML = `
    <?xml version="1.0" encoding="UTF-8"?>
    <bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
        <bpmn2:process id="Process_1" isExecutable="false">
            <bpmn2:startEvent id="StartEvent_1"/>
        </bpmn2:process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
            <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
                <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
                    <dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>
                </bpmndi:BPMNShape>
            </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
    </bpmn2:definitions>`;

export class ImportWarning extends Error {
    warnings: WarningArray;

    constructor(msg: string, warnings: WarningArray) {
        super(msg);
        this.warnings = warnings;
    }
}

export class ContentController {

    constructor(
        private readonly modeler: BpmnModeler,
    ) {
    }

    public async newDiagram(): Promise<ImportWarning> {
        return this.loadDiagram(EMPTY_DIAGRAM_XML);
    }

    public async loadDiagram(bpmn: string): Promise<ImportWarning> {
        try {
            const { warnings } = await this.modeler.importXML(bpmn);
            //console.log("[Webview] warnings", warnings);

            return new ImportWarning("Imported BPMN 2.0 diagram", warnings);

        } catch (error: any) {
            const { warnings } = error;
            throw new ImportWarning("Failed to import BPMN 2.0 diagram", warnings);
        }
    }

    public async exportDiagram(): Promise<string> {
        return (await this.modeler.saveXML({ format: true })).xml;
    }

    // todo: this is a bit ugly
    public getFiles(data: FolderContent[]): [configs: JSON[] | string[], elementTemplates: JSON[] | string[], forms: JSON[] | string[]] {
        let configs: JSON[] | string[] = [];
        let elTemps: JSON[] | string[] = [];
        let forms: JSON[] | string[] = [];

        for (const folder of data) {
            switch (folder.type) {
                case "config": {
                    configs = folder.files;
                    break;
                }
                case "element-template": {
                    elTemps = folder.files;
                    break;
                }
                case "form": {
                    forms = folder.files;
                    break;
                }
            }
        }
        return [configs, elTemps, forms];
    }
}