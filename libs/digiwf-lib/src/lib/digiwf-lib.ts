import { digiwfDeploymentPluginRest } from "@miragon-process-ide/digiwf-deployment-plugin-rest";

export function digiwfLib(): string {
    const plugins = digiwfDeploymentPluginRest();
    console.log(plugins);
    return "digiwf-lib";
}
