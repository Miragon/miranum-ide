import { digiwfDeploymentPluginRest } from "@miragon-process-ide/digiwf-deployment-plugin-rest";

export function digiwfLib(): string {
    const plugins = digiwfDeploymentPluginRest();
    console.log(plugins);
    return "digiwf-lib";
}


export function deployArtifact(file: string, type: string, project: string | undefined, target: string) {
    // dummy implementation
    console.log(file);
    console.log(type);
    console.log(project);
    console.log(target);
}

export function deployAllArtifacts(path: string, project: string | undefined, target: string) {
    // dummy implementation
    console.log(path);
    console.log(project);
    console.log(target);
}
