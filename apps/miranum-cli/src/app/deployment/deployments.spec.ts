import { Deployment } from "./deployment";
import { Artifact, createMiranumCore, MiranumDeploymentPlugin } from "@miranum-ide/miranum-core";

const pathToProject = "resources/my-process-automation-project/";
const sampleTarget = "local";

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

        await expect(deployment.deployArtifact(file, type, sampleTarget))
            .resolves.not.toThrow();
    });

    it("should raise an error", async () => {
        return deployment.deployArtifact(pathToProject, "BPMN", sampleTarget)
            .catch(e => expect(e).not.toBeNull());
    });
});

describe("deployAllArtifacts", () => {
    it("should work", async () => {
        await expect(deployment.deployAllArtifacts(pathToProject, "http://localhost:8080"))
            .resolves.not.toThrow();
    });

    it("should raise an error", async () => {
        return deployment.deployAllArtifacts("/path/does-not/exist", sampleTarget)
            .catch(e => expect(e).not.toBeNull());
    });
});
