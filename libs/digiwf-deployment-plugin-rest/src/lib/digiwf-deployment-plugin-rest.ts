import { Configuration, DeploymentAPIApi } from "./openapi";
import {
    Artifact,
    Success,
    DigiWFDeploymentPlugin,
    DigiWFDeploymentTarget
} from "@miragon-process-ide/digiwf-lib";

export class DigiwfDeploymentPluginRest implements DigiWFDeploymentPlugin{
    name: string;
    targetEnvironments: DigiWFDeploymentTarget[];

    constructor(name: string, targetEnvironments: DigiWFDeploymentTarget[]) {
        this.name = name;
        this.targetEnvironments = targetEnvironments;
    }

    async deploy(target : string, artifact : Artifact) : Promise<Success> {
        const targetEnv = this.targetEnvironments.filter(env => env.name === target);
        if (targetEnv.length === 0) {
            return {
                success: false,
                message: `No target configured for ${target}`
            };
        }

        const deployment = {
            target: target,
            artifact: {
                ...artifact,
            }
        };
        const response = await new DeploymentAPIApi(new Configuration({basePath: targetEnv[0].url})).deployArtifact(deployment);
        return {
            success: !!response.data.success,
            message: response.data.message
        };
    }

}
