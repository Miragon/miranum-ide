import { DigiwfConfig, DigiwfLib } from "./digiwf-lib";
import { DeploymentSuccess } from "./types";
import * as fs from "fs";

const pathToProject = "resources/my-process-automation-project/";
const project = "my-process-automation-project";
const target = "http://localhost:8080";

const config: DigiwfConfig = {
    deploymentPlugins: [
        {
            name: "rest",
            targetEnvironments: [],
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


describe("generateProcess", () => {
    const pathToGenerations = "resources/my-generations";
    const startBPMN: string =
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
        "<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" id=\"Definitions_1ni255e\" targetNamespace=\"http://bpmn.io/schema/bpmn\" xmlns:zeebe=\"http://camunda.org/schema/zeebe/1.0\" xmlns:modeler=\"http://camunda.org/schema/modeler/1.0\" exporter=\"Camunda Modeler\" exporterVersion=\"5.2.0\" modeler:executionPlatform=\"Camunda Cloud\" modeler:executionPlatformVersion=\"8.0.0\">\n" +
        "  <bpmn:process id=\"Process_16vr885\" isExecutable=\"true\">\n" +
        "    <bpmn:startEvent id=\"StartEvent_1\" />\n" +
        "  </bpmn:process>\n" +
        "  <bpmndi:BPMNDiagram id=\"BPMNDiagram_1\">\n" +
        "    <bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_16vr885\">\n" +
        "      <bpmndi:BPMNShape id=\"_BPMNShape_StartEvent_2\" bpmnElement=\"StartEvent_1\">\n" +
        "        <dc:Bounds x=\"179\" y=\"159\" width=\"36\" height=\"36\" />\n" +
        "      </bpmndi:BPMNShape>\n" +
        "    </bpmndi:BPMNPlane>\n" +
        "  </bpmndi:BPMNDiagram>\n" +
        "</bpmn:definitions>";

    it("should work", async () => {
        if(fs.existsSync(`${pathToGenerations}/testFile.bpmn`)){
            fs.unlinkSync(`${pathToGenerations}/testFile.bpmn`)
        }

        const generateSuccesses = await digiwfLib.generateProcess("bpmn", "testFile", pathToGenerations);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe("Generated a file successfully");
        expect(fs.readFileSync(`${pathToGenerations}/testFile.bpmn`).toString()).toEqual(startBPMN);

        fs.unlinkSync(`${pathToGenerations}/testFile.bpmn`)
    });

    it("should raise an error", async () => {
        const generateSuccesses = await digiwfLib.generateProcess("bpmn", "errorFile", `${pathToGenerations}/error`);
        expect(generateSuccesses.success).toBeFalsy();
        expect(generateSuccesses.message).toBe("Failed to generate a file");
    });

    it("should not work", async () => {
        const generateSuccesses = await digiwfLib.generateProcess("typo", "typoFile", pathToGenerations);
        expect(generateSuccesses.success).toBeFalsy();
        expect(generateSuccesses.message).toBe("The given type is not supported");
    });

});
