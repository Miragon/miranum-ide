import { getFile, getFiles } from "./read-fs/read-fs";
import { createFile, generateStructure } from "./generate/generate";
import { Artifact, Success, DigiWFDeploymentPlugin } from "./types";
import { v4 as uuidv4 } from "uuid";
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


    /* eslint-disable  @typescript-eslint/no-explicit-any */
    public async generateArtifact(type: string, name: string, path: string, templateBase?: string | undefined, templateFiller?: any | undefined): Promise<Success> {
        const fileName: string = name.replace("." + type, "")
                                    .replace(".json","")
                                    .replace(".schema", "");
        const id: string = fileName.trim().replace(/\s+/g, "") + "_" + uuidv4();
        const TEMPLATES = new Map<string, any>([
            ["bpmn", {path: "resources/templates/bpmn-default.bpmn",
                    data: {version: "7.17.0", Process_id: id, name: fileName, doc: "doc"}}],
            ["dmn", {path: "resources/templates/dmn-default.dmn",
                    data: {Definition_id: id, name: fileName, version: "7.17.0", DecisionName: "Decision 1"}}],
            ["form", {path: "resources/templates/form-default.schema.json",
                    data:{key: name, type: "object"}}],
            ["config", {path: "resources/templates/config-default.json",
                    data: {key: name, serviceKey: "S3Service", serviceValue: "dwf-s3-local-01"}}],
            ["element-template", {path: "resources/templates/element-default.json",
                    data: {name: fileName, id: id}}]
        ]);

        if(!TEMPLATES.has(type)){
            return {
                success: false,
                message: `The given type: "${type}" is not supported`
            }
        }

        let filepath = `${path}/${fileName}.${type}`;
        if(type === "config" || type === "element-template") {
            filepath = `${path}/${fileName}.json`;
        } else if(type === "form") {
            filepath = `${path}/${fileName}.schema.json`;
        }

        const chosenTemplate = TEMPLATES.get(type);
        const content = await Sqrl.renderFile(templateBase? templateBase : chosenTemplate.path
                                            ,templateFiller? JSON.parse(templateFiller) : chosenTemplate.data);

        return createFile(filepath, content);
    }

    //might cause issues since it's the same name
    public async generateProject(path: string): Promise<Success> {
        return generateStructure(path);
    }

}
