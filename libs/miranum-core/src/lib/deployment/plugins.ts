import { DigiwfDeploymentPluginRest } from "./rest/digiwf-deployment-plugin-rest";
import { MiranumDeploymentPlugin } from "../types";

const restPlugin = new DigiwfDeploymentPluginRest("rest", [
    {
        name: "local",
        url: "http://localhost:8080"
    },
    {
        name: "dev",
        url: "http://localhost:8080"
    },
    {
        name: "test",
        url: "http://localhost:8080"
    }
]);

export const availableDeploymentPlugins: MiranumDeploymentPlugin[] = [
    restPlugin
];
