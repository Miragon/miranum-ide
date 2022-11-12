import { DigiwfDeploymentPluginRest } from "./rest/digiwf-deployment-plugin-rest";
import { Artifact, DigiWFDeploymentPlugin } from "../types";

const dryPlugin = {
    name: "dry",
    targetEnvironments: [{name:"local",url:"http://localhost:8080"}],
    deploy: function(target: string, artifact: Artifact) {
        return Promise.resolve(artifact);
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
