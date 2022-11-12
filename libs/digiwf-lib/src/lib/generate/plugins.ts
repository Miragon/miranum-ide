import { Artifact, DigiWFGeneratorPlugin } from "../types";
import * as Sqrl from "squirrelly"
import { v4 as uuidv4 } from "uuid";

export class DigiwfArtifactGenerator implements DigiWFGeneratorPlugin {
    type : string;
    fileExtension: string;
    template: string;
    basePath: string | undefined;
    defaultData: object;

    constructor(type: string, fileExtension: string, template: string, defaultData: object, basePath?: string) {
        this.type = type;
        this.fileExtension = fileExtension;
        this.template = template;
        this.basePath = basePath;
        this.defaultData = defaultData;
    }

    async generate(name : string, project: string, path?: string) : Promise<Artifact> {
        const fileName: string = name.replace(/\.[^/.]+$/, "");
        const data: any = this.defaultData;
        data["id"] = fileName.trim().replace(/\s+/g, "") + "_" + uuidv4();
        data["name"] = fileName;
        const fileContent = await Sqrl.render(this.template, data);

        const fileDetails = {
            name: fileName,
            extension: this.fileExtension.toLowerCase(),
            content: fileContent,
            pathInProject: `${(path ?? this.basePath) ?? ""}/${name}.${this.fileExtension.toLowerCase()}`
        }
        return {
            type: this.type,
            project: project,
            file: fileDetails
        }
    }
}

export class ProcessIdeJsonGenerator implements DigiWFGeneratorPlugin {
    basePath: string | undefined;
    defaultData = {};
    fileExtension = "json";
    template: string;
    type = "process-ide.json";

    constructor(template: string) {
        this.template = template;
    }

    async generate(name : string, project : string, path?: string) : Promise<Artifact> {
        const fileContent = await Sqrl.render(this.template, {projectName: project});
        const fileDetails = {
            name: "process-ide",
            extension: this.fileExtension,
            content: fileContent,
            pathInProject: `/${this.type}`
        }
        return {
            type: this.type,
            project: project,
            file: fileDetails
        }
    }

}

export class GitkeepGenerator implements DigiWFGeneratorPlugin {
    type  = ".gitkeep";
    fileExtension = ".gitkeep";
    template = "";
    basePath: string | undefined;
    defaultData: object = {};

    async generate(name : string, project: string, path?: string) : Promise<Artifact> {
        const fileDetails = {
            name: ".gitkeep",
            extension: "",
            content: "",
            pathInProject: `/${name}/.gitkeep`
        }
        return {
            type: this.type,
            project: project,
            file: fileDetails
        }
    }
}

export class ReadmeGenerator implements DigiWFGeneratorPlugin {
    type  = "README.md";
    fileExtension = "md";
    template: string;
    basePath: string | undefined;
    defaultData: object = {};

    constructor(template: string) {
        this.template = template;
    }

    async generate(name : string, project: string, path?: string) : Promise<Artifact> {
        const fileContent = await Sqrl.render(this.template, {name: name});
        const fileDetails = {
            name: "README",
            extension: this.fileExtension,
            content: fileContent,
            pathInProject: `/${this.type}`
        }
        return {
            type: this.type,
            project: project,
            file: fileDetails
        }
    }
}

const bpmnGenerator = new DigiwfArtifactGenerator("bpmn", "bpmn",
    `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="Definitions_0sduois" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.2.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="{{it.version}}">
  <bpmn:process id="{{it.id}}" name="{{it.name}}" isExecutable="true">
    <bpmn:documentation></bpmn:documentation>
    <bpmn:extensionElements />
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="{{it.id}}">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="79" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`, {version: "7.17.0"});
const dmnGenerator = new DigiwfArtifactGenerator("dmn",  "dmn",
    `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="{{it.id}}" name="{{it.name}}" namespace="http://camunda.org/schema/1.0/dmn" exporter="Camunda Modeler" exporterVersion="5.2.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="{{it.version}}">
  <decision id="Decision_1ja0uxu" name="{{it.DecisionName}}">
    <decisionTable id="DecisionTable_1shndzu">
      <input id="Input_1">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" typeRef="string" />
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="Decision_1ja0uxu">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`, {version: "7.17.0", DecisionName: "Decision 1"});
const formGenerator = new DigiwfArtifactGenerator("form", "form",
    `{
  "key": "{{it.name}}",
  "schema": {
    "type": "object",
    "x-display": "stepper",
    "allOf": [
      {
        "title": "Input",
        "description": "",
        "type": "object",
        "x-options": {
          "sectionsTitlesClasses": [
            "d-none"
          ]
        },
        "allOf": [
            {{it.allOf | safe}}
        ],
        "key": "{{it.allOfKey}}"
      }
    ]
  }
}`, {allOfKey: "FORMSECTION_input"}, "/forms");
const configGenerator = new DigiwfArtifactGenerator("config", "json",
    `{
  "key": "{{it.name}}",
  "statusDokument": "",
  "statusConfig": [],
  "configs": [
    {
      "key": "",
      "value": ""
    }
  ]
}`, {}, "/configs");
const elementTemplateGenerator = new DigiwfArtifactGenerator("element-template", "json",
    `{
  "name": "{{it.name}}",
  "id": "{{it.id}}",
  "appliesTo": [
    {
    "0": "bpmn:ServiceTask"
    }
  ],
  "properties": [],
  "entriesVisible": [
    {
      "_all": true
    }
  ]
}`, {}, "/element-templates");
const processIdeJsonGenerator  = new ProcessIdeJsonGenerator(`{
  "projectVersion": "1.0.0",
  "name": "{{it.projectName}}",
  "workspace": {
    "forms": "forms",
    "elementTemplates": "element-templates",
    "processConfigs": "configs"
  },
  "deployment": [
    {
      "plugin": "rest",
      "targetEnvironments": [
        {
          "name": "local",
          "url": "http://localhost:8080"
        },
        {
          "name": "dev",
          "url": "http://localhost:8080"
        },
        {
          "name": "test",
          "url": "http://localhost:8080"
        }
      ]
    }
  ]
}`);
const gitkeepGenerator = new GitkeepGenerator();
const readmeGenerator = new ReadmeGenerator(
    `# <span style="font-family: Academy Engraved LET; color:#00E676">{{it.name}}</span>

    .
    ├── configs
    │     ├── dev-config.json
    │     └── prod-config.json
    │
    ├── element-templates
    │     └── .gitkeep
    │
    ├── forms
    │     ├── control.form
    │     └── start.form
    │
    ├── example-dmn.dmn
    └── example-bpmn.bpmn
`);

export const availableGeneratorPlugins: Map<string, DigiWFGeneratorPlugin> = new Map<string, DigiWFGeneratorPlugin>([
    [bpmnGenerator.type, bpmnGenerator],
    [dmnGenerator.type, dmnGenerator],
    [formGenerator.type, formGenerator],
    [configGenerator.type, configGenerator],
    [elementTemplateGenerator.type, elementTemplateGenerator],
    [processIdeJsonGenerator.type, processIdeJsonGenerator],
    [gitkeepGenerator.type, gitkeepGenerator],
    [readmeGenerator.type, readmeGenerator],
]);
