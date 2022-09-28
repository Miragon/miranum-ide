import { DigiwfConfig, DigiwfLib } from "./digiwf-lib";
import { Success } from "./types";
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
                return new Promise<Success>(resolve => resolve({
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

    it("should raise an error", async () => {
        const generateSuccesses = await digiwfLib.generateArtifact("bpmn", "errorFile", `${pathToGenerations}/error`);
        expect(generateSuccesses.success).toBeFalsy();
        expect(generateSuccesses.message).toBe(`Failed to generate ${pathToGenerations}/error/errorFile.bpmn`);
    });

    it("should not work", async () => {
        const generateSuccesses = await digiwfLib.generateArtifact("typo", "typoFile", pathToGenerations);
        expect(generateSuccesses.success).toBeFalsy();
        expect(generateSuccesses.message).toBe(`The given type: "typo" is not supported`);
    });

    it("should ignore whitespaces", async () => {
        const cleanID = "<bpmn:process id=\"whitespaceFile_"

        if(fs.existsSync(`${pathToGenerations}/white space   File.bpmn`)){
            fs.unlinkSync(`${pathToGenerations}/white space   File.bpmn`)
        }

        const generateSuccesses = await digiwfLib.generateArtifact("bpmn", "white space   File", pathToGenerations);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated ${pathToGenerations}/white space   File.bpmn successfully`);
        expect(fs.readFileSync(`${pathToGenerations}/white space   File.bpmn`).toString()).toContain(cleanID);

        fs.unlinkSync(`${pathToGenerations}/white space   File.bpmn`)
    });

    it("BPMN should work", async () => {
        //careful, defaultBPMN is hardcoded
        const defaultBPMN: string =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:modeler=\"http://camunda.org/schema/modeler/1.0\" id=\"Definitions_0sduois\" targetNamespace=\"http://bpmn.io/schema/bpmn\" exporter=\"Camunda Modeler\" exporterVersion=\"5.2.0\" modeler:executionPlatform=\"Camunda Platform\" modeler:executionPlatformVersion=\"7.17.0\">\n" +
            "  <bpmn:process id=\"testFile_uuid\" name=\"testFile\" isExecutable=\"true\">\n" +
            "    <bpmn:documentation>doc</bpmn:documentation>\n" +
            "    <bpmn:extensionElements />\n" +
            "    <bpmn:startEvent id=\"StartEvent_1\" />\n" +
            "  </bpmn:process>\n" +
            "  <bpmndi:BPMNDiagram id=\"BPMNDiagram_1\">\n" +
            "    <bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"testFile_uuid\">\n" +
            "      <bpmndi:BPMNShape id=\"_BPMNShape_StartEvent_2\" bpmnElement=\"StartEvent_1\">\n" +
            "        <dc:Bounds x=\"179\" y=\"79\" width=\"36\" height=\"36\" />\n" +
            "      </bpmndi:BPMNShape>\n" +
            "    </bpmndi:BPMNPlane>\n" +
            "  </bpmndi:BPMNDiagram>\n" +
            "</bpmn:definitions>\n"

        if(fs.existsSync(`${pathToGenerations}/testFile.bpmn`)){
            fs.unlinkSync(`${pathToGenerations}/testFile.bpmn`)
        }

        const generateSuccesses = await digiwfLib.generateArtifact("bpmn", "testFile", pathToGenerations);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated ${pathToGenerations}/testFile.bpmn successfully`);
        expect(fs.readFileSync(`${pathToGenerations}/testFile.bpmn`).toString()).toContain(defaultBPMN.substring(0,512));
        expect(fs.readFileSync(`${pathToGenerations}/testFile.bpmn`).toString()).toContain(defaultBPMN.substring(518,798));

        fs.unlinkSync(`${pathToGenerations}/testFile.bpmn`)
    });

    it("DMN should work", async () => {
        const defaultDMN =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<definitions xmlns=\"https://www.omg.org/spec/DMN/20191111/MODEL/\" xmlns:dmndi=\"https://www.omg.org/spec/DMN/20191111/DMNDI/\" xmlns:dc=\"http://www.omg.org/spec/DMN/20180521/DC/\" xmlns:modeler=\"http://camunda.org/schema/modeler/1.0\" id=\"testFile_uuid\" name=\"testFile\" namespace=\"http://camunda.org/schema/1.0/dmn\" exporter=\"Camunda Modeler\" exporterVersion=\"5.2.0\" modeler:executionPlatform=\"Camunda Platform\" modeler:executionPlatformVersion=\"7.17.0\">\n" +
            "  <decision id=\"Decision_1ja0uxu\" name=\"Decision 1\">\n" +
            "    <decisionTable id=\"DecisionTable_1shndzu\">\n" +
            "      <input id=\"Input_1\">\n" +
            "        <inputExpression id=\"InputExpression_1\" typeRef=\"string\">\n" +
            "          <text></text>\n" +
            "        </inputExpression>\n" +
            "      </input>\n" +
            "      <output id=\"Output_1\" typeRef=\"string\" />\n" +
            "    </decisionTable>\n" +
            "  </decision>\n" +
            "  <dmndi:DMNDI>\n" +
            "    <dmndi:DMNDiagram>\n" +
            "      <dmndi:DMNShape dmnElementRef=\"Decision_1ja0uxu\">\n" +
            "        <dc:Bounds height=\"80\" width=\"180\" x=\"160\" y=\"100\" />\n" +
            "      </dmndi:DMNShape>\n" +
            "    </dmndi:DMNDiagram>\n" +
            "  </dmndi:DMNDI>\n" +
            "</definitions>\n"

        if(fs.existsSync(`${pathToGenerations}/testFile.dmn`)){
            fs.unlinkSync(`${pathToGenerations}/testFile.dmn`)
        }

        const generateSuccesses = await digiwfLib.generateArtifact("dmn", "testFile", pathToGenerations);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated ${pathToGenerations}/testFile.dmn successfully`);
        expect(fs.readFileSync(`${pathToGenerations}/testFile.dmn`).toString()).toContain(defaultDMN.substring(289));

        fs.unlinkSync(`${pathToGenerations}/testFile.dmn`)
    });

    it("form should work", async () => {
        const defaultForm =
            "{\n" +
            "  \"key\": \"testFile\",\n" +
            "  \"type\": \"object\",\n" +
            "  \"allOf\": [\n" +
            "    {\n" +
            "      \"title\": \"Abschnitt\",\n" +
            "      \"description\": \"\",\n" +
            "      \"type\": \"object\",\n" +
            "      \"x-options\": {\n" +
            "        \"sectionsTitlesClasses\": [\n" +
            "          \"d-none\"\n" +
            "        ]\n"

        if(fs.existsSync(`${pathToGenerations}/testFile.schema.json`)){
            fs.unlinkSync(`${pathToGenerations}/testFile.schema.json`)
        }

        const generateSuccesses = await digiwfLib.generateArtifact("form", "testFile", pathToGenerations);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated ${pathToGenerations}/testFile.schema.json successfully`);
        expect(fs.readFileSync(`${pathToGenerations}/testFile.schema.json`).toString()).toContain(defaultForm);

        fs.unlinkSync(`${pathToGenerations}/testFile.schema.json`)
    });

    it("config should work", async () => {
        const defaultElement =
            "{\n" +
            "  \"key\": \"configTest\",\n" +
            "  \"statusDokument\": \"\",\n" +
            "  \"statusConfig\": [],\n" +
            "  \"configs\": [\n" +
            "    {\n" +
            "      \"key\": \"S3Service\",\n" +
            "      \"value\": \"dwf-s3-local-01\"\n" +
            "    }\n" +
            "  ]\n" +
            "}\n"

        if(fs.existsSync(`${pathToGenerations}/configTest.json`)){
            fs.unlinkSync(`${pathToGenerations}/configTest.json`)
        }

        const generateSuccesses = await digiwfLib.generateArtifact("config", "configTest", pathToGenerations);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated ${pathToGenerations}/configTest.json successfully`);
        expect(fs.readFileSync(`${pathToGenerations}/configTest.json`).toString()).toEqual(defaultElement);

        fs.unlinkSync(`${pathToGenerations}/configTest.json`)
    });

    it("element-template should work", async () => {
        const defaultElement =
            "{\n" +
            "  \"name\": \"elementTest\",\n" +
            "  \"id\": \"elementTest_uuid\",\n" +
            "  \"appliesTo\": [\n" +
            "    {\n" +
            "    \"0\": \"bpmn:ServiceTask\"\n" +
            "    }\n" +
            "  ],\n" +
            "  \"properties\": [],\n" +
            "  \"entriesVisible\": [\n" +
            "    {\n" +
            "      \"_all\": true\n" +
            "    }\n" +
            "  ]\n" +
            "}\n"

        if(fs.existsSync(`${pathToGenerations}/elementTest.json`)){
            fs.unlinkSync(`${pathToGenerations}/elementTest.json`)
        }

        const generateSuccesses = await digiwfLib.generateArtifact("element-template", "elementTest", pathToGenerations);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated ${pathToGenerations}/elementTest.json successfully`);
        expect(fs.readFileSync(`${pathToGenerations}/elementTest.json`).toString()).toContain(defaultElement.substring(0,48));
        expect(fs.readFileSync(`${pathToGenerations}/elementTest.json`).toString()).toContain(defaultElement.substring(53));

        fs.unlinkSync(`${pathToGenerations}/elementTest.json`)
    });

    it("own template should work", async () => {
        const advancements =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\" xmlns:modeler=\"http://camunda.org/schema/modeler/1.0\" id=\"Definitions_0979zyo\" targetNamespace=\"http://bpmn.io/schema/bpmn\" exporter=\"Camunda Modeler\" exporterVersion=\"5.2.0\" modeler:executionPlatform=\"Camunda Platform\" modeler:executionPlatformVersion=\"7.17.0\">\n" +
            "  <bpmn:process id=\"Process_09hzwwp\" name=\"Advanced\" isExecutable=\"true\">\n" +
            "    <bpmn:startEvent id=\"StartEvent_1\">\n" +
            "      <bpmn:outgoing>Flow_1croxed</bpmn:outgoing>\n" +
            "    </bpmn:startEvent>\n" +
            "    <bpmn:task id=\"Activity_1k9h69q\" name=\"Prozess1\">"

        if(fs.existsSync(`${pathToGenerations}/advancedFile.bpmn`)){
            fs.unlinkSync(`${pathToGenerations}/advancedFile.bpmn`)
        }

        const generateSuccesses = await digiwfLib.generateArtifact("bpmn", "advancedFile", pathToGenerations
                                                    , "resources/templates/bpmn-advanced.bpmn"
                                                    , '{"name": "Advanced", "pname": "Prozess1"}');
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated ${pathToGenerations}/advancedFile.bpmn successfully`);
        expect(fs.readFileSync(`${pathToGenerations}/advancedFile.bpmn`).toString()).toContain(advancements);

        fs.unlinkSync(`${pathToGenerations}/advancedFile.bpmn`)
    });

});
