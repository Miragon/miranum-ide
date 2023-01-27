// import { Deployment } from "./deployment";
import {Artifact, createMiranumCore, MiranumDeploymentPlugin} from "@miranum-ide/miranum-core";
import * as colors from "colors";
import {filesToDeploy, pathToProject} from "../../../tests/testHelpers";
import {Deployment} from "./deployment";

const sampleTarget = "local";
const customForm = {nameExt: "KontrollFormular.json", path: "resources/my-process-automation-project/my-other-forms/KontrollFormular.json", type: "form"};

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
    [
        { "type": "form", "path": "forms", "extension": ".form" },
        { "type": "element-template", "path": "element-templates", "extension": ".json" },
        { "type": "config", "path": "configs", "extension": ".config.json" }
    ],
    [dryDeploymentPlugin]
));

const customDeployment = new Deployment(createMiranumCore(
    "0.0.1",
    "my-process-automation-project",
    [
        { "type": "form", "path": "forms", "extension": ".form" },
        { "type": "form", "path": "my-other-forms", "extension": ".json" },
        { "type": "element-template", "path": "my-templates", "extension": ".json" },
        { "type": "config", "path": "configs", "extension": ".config.json" }
    ],
    [dryDeploymentPlugin]
));

describe("deployArtifact", () => {
    for(const file of filesToDeploy) {
        it(`${file.type} should work`, async () => {
            const logSpy = jest.spyOn(console, 'log');
            await expect(deployment.deployArtifact(file.path, file.type, sampleTarget))
                .resolves.not.toThrow();
            expect(logSpy).toHaveBeenCalledWith(colors.green.bold("DEPLOYED ") + file.nameExt + " to environment " + sampleTarget);
        });
    }

    it(`should work with custom Artifact`, async () => {
        const logSpy = jest.spyOn(console, 'log');
        await expect(customDeployment.deployArtifact(customForm.path, customForm.type, sampleTarget))
            .resolves.not.toThrow();
        expect(logSpy).toHaveBeenCalledWith(colors.green.bold("DEPLOYED ") + customForm.nameExt + " to environment " + sampleTarget);
    });

    it(`should not work, due to unsupported type`, async () => {
        const eTemplate = {nameExt: "test.json", path: "resources/my-process-automation-project/element-templates/test.json", type: "element-template"};
        return deployment.deployArtifact(eTemplate.path, eTemplate.type, sampleTarget)
            .catch(e => expect(e).toBe(`${eTemplate.type} is not supported for deployment`));
    });

    it("should raise an error", async () => {
        return deployment.deployArtifact(pathToProject, "BPMN", sampleTarget)
            .catch(e => expect(e).not.toBeNull());
    });
});

describe("deployAllArtifacts", () => {
    it("should work", async () => {
        const logSpy = jest.spyOn(console, 'log');
        await expect(customDeployment.deployAllArtifacts(pathToProject, sampleTarget))
            .resolves.not.toThrow();

        for (const file of filesToDeploy) {
            expect(logSpy).toHaveBeenCalledWith(colors.green.bold("DEPLOYED ") + file.nameExt + " to environment " + sampleTarget);
        }
        expect(logSpy).toHaveBeenCalledWith(colors.green.bold("DEPLOYED ") + customForm.nameExt + " to environment " + sampleTarget);
    });

    it("should raise an error", async () => {
        return deployment.deployAllArtifacts("/path/does-not/exist", sampleTarget)
            .catch(e => expect(e).not.toBeNull());
    });
});
