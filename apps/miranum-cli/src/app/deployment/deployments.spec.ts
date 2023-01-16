import { Deployment } from "./deployment";
import {Artifact, createMiranumCore, MiranumDeploymentPlugin} from "@miranum-ide/miranum-core";
import * as colors from "colors";
import {filesToDeploy} from "../shared/testHelpers.spec";

const pathToProject = "resources/my-process-automation-project/";
const sampleTarget = "local";

const dryDeploymentPlugin: MiranumDeploymentPlugin = {
    plugin: "dry",
    targetEnvironments: [{name:"local",url:"http://localhost:8080"}],
    deploy: function(target: string, artifact: Artifact) {
        return Promise.resolve(artifact);
    }
};

const deployment = new Deployment(createMiranumCore(
    "0.0.1",
    "my-process-automation-project",
    {
        "forms": "forms",
        "elementTemplates": "element-templates",
        "configs": "configs"
    },
    [dryDeploymentPlugin])
);

describe("deployArtifact", () => {
    for(const file of filesToDeploy) {
        it(`${file.type} should work`, async () => {
            const logSpy = jest.spyOn(console, 'log');
            await deployment.deployArtifact(file.path, file.type, sampleTarget);

            expect(logSpy).toHaveBeenCalledWith(colors.green.bold("DEPLOYED ") + file.nameExt + " to environment " + sampleTarget);
        });
    }

    it("should raise an error", async () => {
        return deployment.deployArtifact(pathToProject, "BPMN", sampleTarget)
            .catch(e => expect(e).not.toBeNull());
    });
});

describe("deployAllArtifacts", () => {
    it("should work", async () => {
        const logSpy = jest.spyOn(console, 'log');
        await deployment.deployAllArtifacts(pathToProject, sampleTarget);

        for (const file of filesToDeploy) {
            expect(logSpy).toHaveBeenCalledWith(colors.green.bold("DEPLOYED ") + file.nameExt + " to environment " + sampleTarget);
        }

    });

    it("should raise an error", async () => {
        return deployment.deployAllArtifacts("/path/does-not/exist", sampleTarget)
            .catch(e => expect(e).not.toBeNull());
    });
});
