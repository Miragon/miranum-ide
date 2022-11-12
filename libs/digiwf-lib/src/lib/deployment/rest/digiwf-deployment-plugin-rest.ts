import { Configuration, DeploymentAPIApi } from "./openapi";
import { Artifact, DigiWFDeploymentPlugin, DigiWFDeploymentTarget } from "../../types";


export class DigiwfDeploymentPluginRest implements DigiWFDeploymentPlugin {
    name: string;
    targetEnvironments: DigiWFDeploymentTarget[];

    constructor(name: string, targetEnvironments: DigiWFDeploymentTarget[]) {
        this.name = name;
        this.targetEnvironments = targetEnvironments;
    }

    async deploy(target : string, artifact : Artifact) : Promise<Artifact> {
        const targetEnv = this.targetEnvironments.filter(env => env.name === target);
        if (targetEnv.length === 0) {
            throw new Error(`No target configured for ${target}`);
        }

        const deployment = {
            target: target,
            artifact: {
                ...artifact,
            }
        };
        const response = await new DeploymentAPIApi(new Configuration({basePath: targetEnv[0].url})).deployArtifact(deployment);
        if (!response.data.success) {
            throw new Error(`Failed deployment of artifact ${artifact.file.name} to environment ${target}`);
        }
        return artifact;
    }

}
