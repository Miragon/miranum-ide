import { DeploymentAPIApi } from "./openapi";
import { Artifact, DeploymentSuccess } from "@miragon-process-ide/digiwf-lib";


export async function restDeployment(target: string, artifact: Artifact): Promise<DeploymentSuccess> {
    const deployment = {
        target: target,
        artifact: {
            ...artifact,
        }
    };
    const response = await new DeploymentAPIApi().deployArtifact(deployment);
    return {
        success: !!response.data.success,
        message: response.data.message
    };
}
