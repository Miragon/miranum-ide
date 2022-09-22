import { getFile, getFiles } from "./read-fs/read-fs";
import {Artifact, DeploymentSuccess, DigiWFDeploymentPlugin, GeneratorSuccess} from "./types";

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

    public async generateArtifact(type: string, name: string, path: string, base: string | undefined): Promise<GeneratorSuccess> {
        console.log(type, name, path, base);
        const success = {
            "success": true,
            "message": ""
        }
        return success;
    }
}
