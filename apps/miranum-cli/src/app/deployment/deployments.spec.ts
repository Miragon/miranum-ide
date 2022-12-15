import { Deployment } from "./deployment";
import { Artifact, createMiranumCore, MiranumDeploymentPlugin } from "@miranum-ide/miranum-core";

const pathToProject = "resources/my-process-automation-project/";
const target = "local";

const dryDeploymentPlugin: MiranumDeploymentPlugin = {
    plugin: "dry",
    targetEnvironments: [{name:"local",url:"http://localhost:8080"}],
    deploy: function(target: string, artifact: Artifact) {
        return Promise.resolve(artifact);
    }
};

const deployment = new Deployment(createMiranumCore("0.0.1", "test-project", {}, [dryDeploymentPlugin]));

describe("deployArtifact", () => {
    it("should work", async () => {
        const file = `${pathToProject}my-process.bpmn`;
        const type = "BPMN";

        await expect(deployment.deployArtifact(file, type, target))
            .resolves.not.toThrow();
    });

    it("should raise an error", async () => {
        return deployment.deployArtifact(pathToProject, "BPMN", target)
            .catch(e => expect(e).not.toBeNull());
    });
});

describe("deployAllArtifacts", () => {
    it("should work", async () => {
        const target = "http://localhost:8080";

        await expect(deployment.deployAllArtifacts(pathToProject, target))
            .resolves.not.toThrow();
    });

    it("should raise an error", async () => {
        return deployment.deployAllArtifacts("/path/does-not/exist", target)
            .catch(e => expect(e).not.toBeNull());
    });
});
