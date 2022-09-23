import { getFile, getFiles } from "./read-fs/read-fs";
import {Artifact, DeploymentSuccess, DigiWFDeploymentPlugin, GeneratorSuccess} from "./types";
import * as fs from "fs";
import * as util from "util";

export interface DigiwfConfig {
    deploymentPlugins: DigiWFDeploymentPlugin[];
}

// observer pattern
// https://en.wikipedia.org/wiki/Observer_pattern#Java
export class DigiwfLib {
    deploymentPlugins: DigiWFDeploymentPlugin[] = [];

    constructor(config?: DigiwfConfig) {
        if (config) {
            config.deploymentPlugins.forEach(plugin => {
                this.deploymentPlugins.push(plugin);
            });
        }
    }

    private async deploy(target: string, artifact: Artifact): Promise<DeploymentSuccess> {
        try {
            await Promise.all(
                this.deploymentPlugins.map(plugin => plugin.deploy(target, artifact))
            );
            return {
                success: true,
                message: "Everything is deployed successfully"
            };
        } catch (err) {
            return {
                success: false,
                message: "Deployment failed"
            }
        }
    }

    public async deployArtifact(path: string, type: string, project: string | undefined, target: string): Promise<DeploymentSuccess> {
        const file = await getFile(path);
        const artifact = {
            "type": type,
            "project": project ?? "",
            "path": path,
            "file": file
        };
        return this.deploy(target, artifact);
    }

    public async deployAllArtifacts(path: string, project: string | undefined, target: string): Promise<DeploymentSuccess[]> {
        const deployments = [];
        const files = await getFiles(path);
        for (const file of files) {
            let type = file.extension.replace(".", "").toLowerCase();
            if (type === "json") {
                path.includes("schema.json") ? type = "form" : type = "config";
            }
            const artifact = {
                "type": type,
                "project": project ?? "",
                "path": path,
                "file": file
            }
            deployments.push(await this.deploy(target, artifact));
        }
        return deployments;
    }


    private async generate(type: string, filePath: string, base?: string | undefined): Promise<GeneratorSuccess> {
        const supportedTypes = ['bpmn', 'dmn', 'form', 'config', 'element'];
        const startBPMN =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" id=\"Definitions_1ni255e\" targetNamespace=\"http://bpmn.io/schema/bpmn\" xmlns:zeebe=\"http://camunda.org/schema/zeebe/1.0\" xmlns:modeler=\"http://camunda.org/schema/modeler/1.0\" exporter=\"Camunda Modeler\" exporterVersion=\"5.2.0\" modeler:executionPlatform=\"Camunda Cloud\" modeler:executionPlatformVersion=\"8.0.0\">\n" +
            "  <bpmn:process id=\"Process_16vr885\" isExecutable=\"true\">\n" +
            "    <bpmn:startEvent id=\"StartEvent_1\" />\n" +
            "  </bpmn:process>\n" +
            "  <bpmndi:BPMNDiagram id=\"BPMNDiagram_1\">\n" +
            "    <bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_16vr885\">\n" +
            "      <bpmndi:BPMNShape id=\"_BPMNShape_StartEvent_2\" bpmnElement=\"StartEvent_1\">\n" +
            "        <dc:Bounds x=\"179\" y=\"159\" width=\"36\" height=\"36\" />\n" +
            "      </bpmndi:BPMNShape>\n" +
            "    </bpmndi:BPMNPlane>\n" +
            "  </bpmndi:BPMNDiagram>\n" +
            "</bpmn:definitions>";

        if(!supportedTypes.includes(type)) {
            return {
                success: false,
                message: `The given type: "${type}" is not supported`
            }
        }
        try {
            const writeFilePromise = util.promisify(fs.writeFile);
            await writeFilePromise(`${filePath}.${type}`, startBPMN);
            return {
                success: true,
                message: `Generated ${filePath}.${type} successfully`
            };
        } catch (err) {
            return {
                success: false,
                message: `Failed to generate ${filePath}.${type}`
            }
        }
    }

    public async generateProcess(type: string, name: string, path: string, base?: string | undefined): Promise<GeneratorSuccess> {
        const fileName: string = name.replace("." + type, "");

        return this.generate(type, `${path}/${fileName}`, base);
    }

}
