import { Artifact, MiranumGeneratorPlugin } from "../types";
import * as Sqrl from "squirrelly";
import { v4 as uuidv4 } from "uuid";

export class MiranumArtifactGenerator implements MiranumGeneratorPlugin {
    type: string;

    defaultFileExtension: string;

    template: string;

    basePath: string | undefined;

    defaultData: object;

    constructor(
        type: string,
        defaultFileExtension: string,
        template: string,
        defaultData: object,
        basePath: string,
    ) {
        this.type = type;
        this.defaultFileExtension = defaultFileExtension;
        this.template = template;
        this.basePath = basePath;
        this.defaultData = defaultData;
    }

    async generate(
        name: string,
        project: string,
        extension?: string,
        pathInProject?: string,
    ): Promise<Artifact> {
        const fileName: string = name.replace(/\.[^/.]+$/, "");
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const data: any = this.defaultData;
        data.id = fileName.trim().replace(/\s+/g, "") + "_" + uuidv4();
        data.name = fileName;
        data.projectName = project;
        const fileContent = await Sqrl.render(this.template, data);
        const fileExtension = extension ?? this.defaultFileExtension.toLowerCase();

        const fileDetails = {
            name: fileName,
            extension: fileExtension,
            content: fileContent,
            pathInProject: `${pathInProject ?? this.basePath}/${name}${fileExtension}`,
        };
        return {
            type: this.type,
            project: project,
            file: fileDetails,
        };
    }
}

//     -----------------------------Generators-----------------------------     \\

const bpmnGenerator = new MiranumArtifactGenerator(
    "bpmn",
    ".bpmn",
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
</bpmn:definitions>`,
    { version: "7.17.0" },
    "",
);

const dmnGenerator = new MiranumArtifactGenerator(
    "dmn",
    ".dmn",
    `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="{{it.id}}" name="{{it.name}}" namespace="http://camunda.org/schema/1.0/dmn" exporter="Camunda Modeler" exporterVersion="5.2.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="{{it.version}}">
  <decision id="Decision_1ja0uxu" name="Decision 1">
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
</definitions>`,
    { version: "7.17.0" },
    "",
);

const formGenerator = new MiranumArtifactGenerator(
    "form",
    ".form",
    `{
  "key": "{{it.name}}",
  "schema": {
    "type": "object",
    "x-display": "stepper",
    "allOf": [
        {
            "title": "Abschnitt",
            "description": "",
            "type": "object",
            "x-options": {
                "sectionsTitlesClasses": [
                    "d-none"
                ]
            },
            "allOf": []
        }
    ]
    }
}`,
    { allOfKey: "FORMSECTION_input" },
    "/forms",
);

const configGenerator = new MiranumArtifactGenerator(
    "config",
    ".config.json",
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
}`,
    {},
    "/configs",
);

const elementTemplateGenerator = new MiranumArtifactGenerator(
    "element-template",
    ".json",
    `{
  "$schema": "https://unpkg.com/@camunda/element-templates-json-schema/resources/schema.json",
  "name": "{{it.name}}",
  "id": "{{it.id}}",
  "appliesTo": [
    "bpmn:ServiceTask"
  ],
  "properties": []
}`,
    {},
    "/element-templates",
);

const miranumJsonGenerator = new MiranumArtifactGenerator(
    "miranum.json",
    ".json",
    `{
  "projectVersion": "1.0.0",
  "name": "{{it.projectName}}",
  "workspace": [
    { "type": "bpmn", "path": "", "extension": ".bpmn" },
    { "type": "dmn", "path": "", "extension": ".dmn" },
    { "type": "form", "path": "forms", "extension": ".form" },
    { "type": "element-template", "path": "element-templates", "extension": ".json" },
    { "type": "config", "path": "configs", "extension": ".config.json" }
  ],
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
}`,
    {},
    "",
);

const gitkeepGenerator = new MiranumArtifactGenerator(
    ".gitkeep",
    ".gitkeep",
    "{{it.data}}",
    { data: "" },
    "/element-templates",
);

const readmeGenerator = new MiranumArtifactGenerator(
    "README.md",
    ".md",
    `# <span style="font-family: Academy Engraved LET; color:#00E676">{{it.projectName}}</span>

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
    ├── miranum.json
    └── example-bpmn.bpmn
`,
    {},
    "",
);

export const availableGeneratorPlugins: Map<string, MiranumGeneratorPlugin> = new Map<
    string,
    MiranumGeneratorPlugin
>([
    [bpmnGenerator.type, bpmnGenerator],
    [dmnGenerator.type, dmnGenerator],
    [formGenerator.type, formGenerator],
    [configGenerator.type, configGenerator],
    [elementTemplateGenerator.type, elementTemplateGenerator],
    [miranumJsonGenerator.type, miranumJsonGenerator],
    [gitkeepGenerator.type, gitkeepGenerator],
    [readmeGenerator.type, readmeGenerator],
]);
