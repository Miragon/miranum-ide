import { FolderContent } from "../types/VsCode";
import { debounce } from "debounce";
import BpmnModeler from "bpmn-js/lib/Modeler";
import { VscController } from "./VscController";

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
</bpmn2:definitions>
`;

export class ContentController {

    public sendUpdate = debounce(this.exportDiagram);

    private eventBus: any;

    public constructor(
        private readonly modeler: typeof BpmnModeler,
        private readonly vscode: VscController,
        bpmn: string,
        folderContent: string,
    ) {
        this.eventBus = this.modeler.get("eventBus");
        this.importDiagram(bpmn);
        this.setListeners(this.getFolderContentFromString(folderContent));
    }

    public async importDiagram(bpmn: string) {
        const str = (bpmn) ? bpmn : EMPTY_DIAGRAM_XML;
        this.modeler.importXML(str);
        this.vscode.updateState({
            ...this.vscode.getState(),
            bpmn: str,
        });
    }

    public async updateFiles(folderContent: FolderContent[]) {
        const [, elementTemplate] = this.getFilesContent(folderContent);
        const loader = this.modeler.get("elementTemplatesLoader");
        loader.setTemplates(elementTemplate);
        // todo: update forms
        this.vscode.updateState({
            ...this.vscode.getState(),
            files: JSON.stringify(folderContent),
        });
    }

    private async exportDiagram() {
        const xml = await this.modeler.saveXML({ format: true }).xml;
        this.vscode.postMessage({
            type: "bpmn-modeler.updateFromWebview",
            content: xml,
        });
    }

    private async setListeners(folderContent: FolderContent[]) {
        // load templates, and console.error the ones that can"t be loaded
        this.eventBus.on("elementTemplates.errors", (event: any) => {
            const { errors } = event;
            console.error(`[MiranumModeler.Webview] ${errors}`);
            // todo: Show message to user
        });
        this.eventBus.get("elementTemplatesLoader").setTemplates(this.getFilesContent(folderContent)[1]);

        this.eventBus.on("commandStack.changed", this.sendUpdate);
    }

    private getFilesContent(folderContent: FolderContent[]): [(JSON[] | string[]), (JSON[] | string[]), (JSON[] | string[])] {
        // todo: configs and elementTemplates should be only of type JSON[]
        let configs: JSON[] | string[] = [];
        let elementTemplates: JSON[] | string[] = [];
        // todo: forms should be only of type string[]
        let forms: JSON[] | string[] = [];

        folderContent.forEach((folder) => {
            switch (folder.type) {
                case "config": {
                    configs = folder.files;
                    break;
                }
                case "element-template": {
                    elementTemplates = folder.files;
                    break;
                }
                case "form": {
                    forms = folder.files; //forms needs to be on window layer, so we can work with it in FormSimpProps
                    break;
                }
            }
        });

        return [configs, elementTemplates, forms];
    }

    private getFolderContentFromString(str: string): FolderContent[] {
        if (!str) {
            return [];
        }

        try {
            return JSON.parse(str);
        } catch (error) {
            return [];
        }
    }

}
