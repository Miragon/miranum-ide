import { getFile, getFiles } from "./read-fs/read-fs";
import {Artifact, DeploymentSuccess, DigiWFDeploymentPlugin, GeneratorSuccess} from "./types";
import * as fs from "fs";
import * as util from "util";

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


    private async generate(type: string, filePath: string, content: string, base?: string | undefined): Promise<GeneratorSuccess> {
        try {
            const writeFilePromise = util.promisify(fs.writeFile);
            await writeFilePromise(`${filePath}.${type}`, content);
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

        const supportedTypes = ['bpmn', 'dmn', 'form', 'config', 'element'];
        if(!supportedTypes.includes(type)) {
            return {
                success: false,
                message: `The given type: "${type}" is not supported`
            }
        }

        const BPMNtemplate = await Sqrl.renderFile("resources/templates/bpmn-default.bpmn", {
            version: "7.17.0", Process_id: `${fileName}_uuid`, name: fileName, doc: "doc"
        }); //most are filled with testvariables at the moment

        //hashmap mit typ als key => "BPMNtemplate als value

        return this.generate(type, `${path}/${fileName}`, BPMNtemplate, base);
    }

}
