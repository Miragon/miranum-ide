import BpmnModeler from "bpmn-js/lib/Modeler";
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
    ElementTemplatesPropertiesProviderModule,
} from "bpmn-js-properties-panel";
import { FolderContent } from "../types/VsCode";
import CamundaPlatformBehaviors from "camunda-bpmn-js-behaviors/lib/camunda-platform";
import camundaModdleDescriptors from "camunda-bpmn-moddle/resources/camunda.json";
import miragonProviderModule from "./PropertieProvider/provider/index";
import ElementTemplateChooserModule from "@bpmn-io/element-template-chooser";
import TokenSimulationModule from "bpmn-js-token-simulation";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import emptyDiagram from "../assets/empty.bpmn?raw";
import debounce from "debounce";
import { VsCodeController } from "./VsCodeController";


export class MiranumModeler {

    private modeler: typeof BpmnModeler;

    private sendUpdate = debounce(this.exportDiagram);

    public constructor(private readonly vscode: VsCodeController) {
        const [, elementTemplates] = this.getFilesContent(this.getFolderContent(this.vscode.getState().files));

        this.modeler = new BpmnModeler({
            container: "#js-canvas",
            keyboard: {
                bindTo: document,
            },
            propertiesPanel: {
                parent: "#js-properties-panel",
            },
            additionalModules: [
                // standard properties panel
                BpmnPropertiesPanelModule,
                BpmnPropertiesProviderModule,
                // camunda properties panel
                CamundaPlatformPropertiesProviderModule,
                CamundaPlatformBehaviors,
                // element templates
                ElementTemplatesPropertiesProviderModule,
                ElementTemplateChooserModule,
                // form simplifier
                miragonProviderModule,
                // simulator
                TokenSimulationModule,
            ],
            moddleExtensions: {
                camunda: camundaModdleDescriptors,
            },
        });

        this.importDiagram(this.vscode.getState().text);

        // load templates, and console.error the ones that can"t be loaded
        this.modeler.get("elementTemplatesLoader").setTemplates(elementTemplates);
        this.modeler.on("elementTemplates.errors", (event: any) => {
            const { errors } = event;
            // todo: Show message to user
            console.error(`[MiranumModeler.Webview] ${errors}`);
        });

        this.modeler.on("commandStack.changed", this.sendUpdate);
    }

    public async importDiagram(xml: string) {
        if (xml) {
            this.modeler.importXML(xml);
        } else {
            this.modeler.importXML(emptyDiagram);
        }
    }

    public async exportDiagram(): Promise<string> {
        // todo: send update to extension
        return (await this.modeler.saveXML({ format: true })).xml;
    }

    public async updateFiles(folderContent: FolderContent[]) {
        const [, elementTemplate, forms] = this.getFilesContent(folderContent);
        const loader = this.modeler.get("elementTemplatesLoader");
        loader.setTemplates(elementTemplate);
        // todo: update forms
    }

    private getFilesContent(folderContent: FolderContent[]): [(JSON[] | string[]), (JSON[] | string[]), (JSON[] | string[])] {
        // todo: configs and elementTemplates should be only of type JSON[]
        let configs: JSON[] | string[] = [];
        let elementTemplates: JSON[] | string[] = [];
        // todo: forms should be only of type string[]
        let forms: JSON[] | string[] = [];

        folderContent.forEach((file) => {
            switch (file.type) {
                case "config": {
                    configs = file.files;
                    break;
                }
                case "element-template": {
                    elementTemplates = file.files;
                    break;
                }
                case "form": {
                    forms = file.files; //forms needs to be on window layer, so we can work with it in FormSimpProps
                    break;
                }
            }
        });

        return [configs, elementTemplates, forms];
    }

    private getFolderContent(str: string): FolderContent[] {
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
