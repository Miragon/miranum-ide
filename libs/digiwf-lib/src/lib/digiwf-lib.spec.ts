import { DigiwfConfig, DigiwfLib } from "./digiwf-lib";
import { DeploymentSuccess } from "./types";

const pathToProject = "resources/my-process-automation-project/";
const project = "my-process-automation-project";
const target = "http://localhost:8080";

const config: DigiwfConfig = {
    deploymentPlugins: [
        {
            name: "rest",
            deploy: function(target: string) {
                console.log(target);
                return new Promise<DeploymentSuccess>(resolve => resolve({
                    success: true,
                    message: `Deployed to ${target}`
                }));
            }
        }
    ]
};

const digiwfLib = new DigiwfLib(config);

describe("deployArtifact", () => {
    it("should work", async () => {
        const file = `${pathToProject}my-process.bpmn`;
        const type = "BPMN";

        const deploymentSuccess = await digiwfLib.deployArtifact(file, type, project, target);

        expect(deploymentSuccess.success).toBeTruthy();
        expect(deploymentSuccess.message).toEqual("Everything is deployed successfully");
    });

    it("should raise an error", async () => {
        return digiwfLib.deployArtifact(pathToProject, "BPMN", project, target)
            .catch(e => expect(e).not.toBeNull());
    });
});

describe("deployAllArtifacts", () => {
    it("should work", async () => {
        const target = "http://localhost:8080";

        const deploymentSuccesses = await digiwfLib.deployAllArtifacts(pathToProject, project, target);

        deploymentSuccesses.forEach(deploymentSuccess => {
            expect(deploymentSuccess.success).toBeTruthy();
            expect(deploymentSuccess.message).toEqual("Everything is deployed successfully");
        });
    });

    it("should raise an error", async () => {
        return digiwfLib.deployAllArtifacts("/path/does-not/exist", project, target)
            .catch(e => expect(e).not.toBeNull());
    });
});
