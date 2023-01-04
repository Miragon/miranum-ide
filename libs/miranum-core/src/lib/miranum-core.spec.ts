import { createMiranumCore, MiranumCore } from "./miranum-core";
import { Artifact } from "./types";

const sampleTarget = "local";
const workspace = {
    forms: "forms",
    elementTemplates: "element-templates",
    processConfigs: "configs"
};
const deploymentPlugin = [
    {
        plugin: "dry",
        targetEnvironments: [
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
        ],
        async deploy(target : string, artifact : Artifact) : Promise<Artifact> {
            return artifact;
        }
    }
];
const miranumCore: MiranumCore = createMiranumCore("1.0.0", "my-project", workspace, deploymentPlugin);

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

        const deployment = await miranumCore.deploy(sampleTarget, exampleArtifact);

        expect(deployment).toEqual(exampleArtifact);
    });

    it("should not be a supported type", async () => {
        const exampleArtifact = {
            type: "test",
            project: "exampleProject",
            file: {
                name: "example.bpmn",
                extension: "bpmn",
                content: "...",
                size: 500
            }
        }
        await miranumCore.deploy(sampleTarget, exampleArtifact)
            .catch(e => expect(e).not.toBeNull());
    });
});
