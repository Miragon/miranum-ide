import { getFile, getFiles } from "./read-fs/read-fs";
import {generate, generateStructure} from "./generate/generate";
import {Artifact, Success, DigiWFDeploymentPlugin} from "./types";

import * as Sqrl from "squirrelly"

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

    private async deploy(target: string, artifact: Artifact): Promise<Success> {
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

    public async deployArtifact(path: string, type: string, project: string | undefined, target: string): Promise<Success> {
        const file = await getFile(path);
        const artifact = {
            "type": type,
            "project": project ?? "",
            "path": path,
            "file": file
        };
        return this.deploy(target, artifact);
    }

    public async deployAllArtifacts(path: string, project: string | undefined, target: string): Promise<Success[]> {
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


    public async generateProcess(type: string, name: string, path: string, templateBase?: string | undefined): Promise<Success> {
        const fileName: string = name.replace("." + type, "");
        const TEMPLATES = new Map<string, any>([
            ["bpmn", {path: "resources/templates/bpmn-default.bpmn",
                    data: {version: "7.17.0", Process_id: `${fileName}_uuid`, name: fileName, doc: "doc"}}],
            ["dmn", "resources/templates/dmn-default.dmn"],
            ["form", "resources/templates/form-default.json"],
            ["config", "resources/templates/config-default.config"],
            ["element-template", "resources/templates/element-default.json"]
        ]);

        if(!TEMPLATES.has(type)){
            return {
                success: false,
                message: `The given type: "${type}" is not supported`
            }
        }
        const chosenTemplate = TEMPLATES.get(type);
        const content = await Sqrl.renderFile(chosenTemplate.path, chosenTemplate.data);

        return generate(type, `${path}/${fileName}`, content, templateBase);
    }

    //might cause issues since it's the same name
    public async generateProject(path: string): Promise<Success> {

        return generateStructure(path);
    }

}
