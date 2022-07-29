import { digiwfDeploymentPluginRest } from "@miragon-process-ide/digiwf-deployment-plugin-rest";
import { Artifact, DeployArtifact } from "./types/Artifact";

export function digiwfLib(): string {
    const plugins = digiwfDeploymentPluginRest();
    console.log(plugins);
    return "digiwf-lib";
}


export function deployFile(deployArtifact: DeployArtifact) {
    console.log(deployArtifact);
}
