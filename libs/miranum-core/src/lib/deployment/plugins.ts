import { MiranumDeploymentPluginRest } from "./rest/miranum-deployment-plugin-rest";
import { MiranumDeploymentPlugin } from "../types";

const restPlugin = new MiranumDeploymentPluginRest("rest", [
    {
        name: "local",
        url: "http://localhost:8080",
    },
    {
        name: "dev",
        url: "http://localhost:8080",
    },
    {
        name: "test",
        url: "http://localhost:8080",
    },
]);

export const availableDeploymentPlugins: MiranumDeploymentPlugin[] = [restPlugin];
