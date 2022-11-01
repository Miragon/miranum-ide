import { DigiwfDeploymentPluginRest } from "./rest/digiwf-deployment-plugin-rest";
import { DigiWFDeploymentPlugin, Success } from "../types";

const dryPlugin = {
    name: "dry",
    targetEnvironments: [{name:"local",url:"http://localhost:8080"}],
    deploy: function(target: string) {
        return new Promise<Success>(resolve => resolve({
            success: true,
            message: `Deployed to ${target}`
        }));
    }
};
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

export const availableDeploymentPlugins: DigiWFDeploymentPlugin[] = [
    dryPlugin,
    restPlugin
];
