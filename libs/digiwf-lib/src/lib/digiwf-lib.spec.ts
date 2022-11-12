import { DigiwfLib } from "./digiwf-lib";
import { availableDeploymentPlugins } from "./deployment/plugins";
import { DigiwfConfig } from "./types";

const target = "local";

const config: DigiwfConfig = {
    deploymentPlugins: availableDeploymentPlugins.filter(plugin => plugin.name === "dry"),
    generatorPlugins: []
};

const digiwfLib = new DigiwfLib(config);

describe("deploy", () => {
    it("should work", async () => {
        const exampleArtifact = {
            type: "BPMN",
            project: "exampleProject",
            file: {
                name: "example.bpmn",
                extension: "bpmn",
                content: "...",
                size: 500
            }
        }

        const deployment = await digiwfLib.deploy(target, exampleArtifact);

        expect(deployment).toEqual(exampleArtifact);
    });
});
