import { inject, singleton } from "tsyringe";

import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    GetMiranumConfigInPort,
    GetWorkspaceItemInPort,
    SetBpmnModelerSettingsInPort,
    SetElementTemplatesInPort,
    SetFormKeysInPort,
} from "../ports/in";
import {
    BpmnModelerSettingsOutPort,
    BpmnUiOutPort,
    DmnUiOutPort,
    DocumentOutPort,
    FileSystemOutPort,
    LogMessageOutPort,
    ShowMessageOutPort,
} from "../ports/out";
import { SettingBuilder } from "../model";
import {
    FileNotFound,
    NoMiranumWorkspaceItemError,
    NoWorkspaceFolderFoundError,
} from "../errors";

@singleton()
export class DisplayBpmnFileUseCase implements DisplayBpmnModelerInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("BpmnUiOutPort")
        private readonly bpmnUiOutPort: BpmnUiOutPort,
        @inject("ShowMessageOutPort")
        protected readonly showMessageOutPort: ShowMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async display(editorId: string): Promise<boolean> {
        try {
            if (editorId !== this.bpmnUiOutPort.getId()) {
                throw new Error("The `editorID` does not match the active editor.");
            }

            let bpmnFile = this.documentOutPort.getContent();

            if (bpmnFile === "") {
                // If a new and empty BPMN file is created, the C7 Modeler will be displayed.
                bpmnFile = EMPTY_C7_BPMN_DIAGRAM;
                this.documentOutPort.write(bpmnFile);
            }

            const regex = /modeler:executionPlatformVersion="([78])\.\d+\.\d+"/;
            const match = bpmnFile.match(regex);

            if (match) {
                const executionPlatform = match[1];
                switch (executionPlatform) {
                    case "7": {
                        if (
                            await this.bpmnUiOutPort.displayBpmnFile(
                                editorId,
                                "c7",
                                bpmnFile,
                            )
                        ) {
                            return true;
                        } else {
                            throw new Error("Displaying the BPMN Modeler failed.");
                        }
                    }
                    case "8": {
                        if (
                            await this.bpmnUiOutPort.displayBpmnFile(
                                editorId,
                                "c8",
                                bpmnFile,
                            )
                        ) {
                            return true;
                        } else {
                            throw new Error("Displaying the BPMN Modeler failed.");
                        }
                    }
                    default:
                        throw new Error(
                            `The execution platform version ${executionPlatform} is not supported.`,
                        );
                }
            } else {
                throw new Error(
                    `Missing execution platform in BPMN file ${this.documentOutPort.getFilePath()}.`,
                );
            }
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.showMessageOutPort.error(
                `A problem occurred while trying to display the BPMN Modeler.\n${
                    (error as Error).message ?? error
                }`,
            );
            return false;
        }
    }
}

@singleton()
export class DisplayDmnModelerUseCase implements DisplayDmnModelerInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("DmnUiOutPort")
        private readonly dmnUiOutPort: DmnUiOutPort,
        @inject("ShowMessageOutPort")
        protected readonly showMessageOutPort: ShowMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async display(editorId: string): Promise<boolean> {
        try {
            if (editorId !== this.dmnUiOutPort.getId()) {
                throw new Error("The `editorID` does not match the active editor.");
            }

            let dmnFile = this.documentOutPort.getContent();

            if (dmnFile === "") {
                dmnFile = EMPTY_DMN_DIAGRAM;
                this.documentOutPort.write(dmnFile);
            }

            if (await this.dmnUiOutPort.displayDmnFile(editorId, dmnFile)) {
                return true;
            } else {
                throw new Error("Displaying the DMN Modeler failed.");
            }
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.showMessageOutPort.error(
                `A problem occurred while trying to display the DMN Modeler.\n${
                    (error as Error).message ?? error
                }`,
            );
            return false;
        }
    }
}

abstract class GetArtifact {
    protected abstract type: string;

    protected abstract getMiranumConfigUseCase: GetMiranumConfigInPort;

    protected abstract getWorkspaceItemUseCase: GetWorkspaceItemInPort;

    protected abstract showMessageOutPort: ShowMessageOutPort;

    protected abstract fileSystemOutPort: FileSystemOutPort;

    async getArtifacts(documentDir: string): Promise<[string[], string]> {
        const miranumConfigPath = await this.getMiranumConfig(documentDir);

        const workspaceItem = await this.getWorkspaceItem(miranumConfigPath, this.type);

        return [
            await this.readDirectory(
                miranumConfigPath?.replace("miranum.json", workspaceItem.path) ??
                    `${documentDir}/${workspaceItem.path}`,
                workspaceItem.extension,
            ),
            workspaceItem.extension,
        ];
    }

    protected abstract readArtifacts(
        artifacts: string[],
        extension?: string,
    ): Promise<string[]>;

    private async getMiranumConfig(documentPath: string): Promise<string | undefined> {
        try {
            return await this.getMiranumConfigUseCase.get(documentPath);
        } catch (error) {
            if (error instanceof NoWorkspaceFolderFoundError) {
                return documentPath;
            }
            return undefined;
        }
    }

    private async getWorkspaceItem(
        miranumConfigPath: string | undefined,
        type: string,
    ): Promise<MiranumWorkspaceItem> {
        if (!miranumConfigPath) {
            return this.getWorkspaceItemUseCase.getDefaultByType(type);
        }

        try {
            return await this.getWorkspaceItemUseCase.getByType(miranumConfigPath, type);
        } catch (error) {
            const root = miranumConfigPath.replace("/miranum.json", "");
            const defaultMessage = `Default workspace is used. You can save element templates in \`${root}/element-templates\` and forms in \`${root}/forms\``;

            if (error instanceof FileNotFound) {
                this.showMessageOutPort.info(
                    `The \`miranum.json\` file is missing!\n${defaultMessage}.`,
                );
            } else if (error instanceof SyntaxError) {
                this.showMessageOutPort.info(
                    `The \`miranum.json\` file has incorrect JSON!\n${defaultMessage}.`,
                );
            } else if (error instanceof NoMiranumWorkspaceItemError) {
                this.showMessageOutPort.info(`${error.message}!\n${defaultMessage}.`);
            } else {
                this.showMessageOutPort.info(
                    `${(error as Error).message}!\n${defaultMessage}.`,
                );
            }
            return this.getWorkspaceItemUseCase.getDefaultByType(type);
        }
    }

    private async readDirectory(folder: string, extension: string): Promise<string[]> {
        const ws = await this.fileSystemOutPort.readDirectory(folder);

        const files: string[] = [];
        for (const [name, type] of ws) {
            if (type === "directory") {
                files.push(
                    ...(await this.readDirectory(`${folder}/${name}`, extension)),
                );
            } else if (type === "file" && name.endsWith(extension)) {
                files.push(`${folder}/${name}`);
            }
        }
        return files;
    }
}

@singleton()
export class SetFormKeysUseCase extends GetArtifact implements SetFormKeysInPort {
    protected readonly type = "form";

    constructor(
        @inject("BpmnUiOutPort")
        private readonly bpmnUiOutPort: BpmnUiOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigUseCase: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemUseCase: GetWorkspaceItemInPort,
        @inject("FileSystemOutPort")
        protected readonly fileSystemOutPort: FileSystemOutPort,
        @inject("ShowMessageOutPort")
        protected readonly showMessageOutPort: ShowMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {
        super();
    }

    async set(editorId: string): Promise<boolean> {
        try {
            if (editorId !== this.documentOutPort.getId()) {
                throw new Error("The `editorID` does not match the active editor.");
            }

            const documentDir = this.documentOutPort
                .getFilePath()
                .split("/")
                .slice(0, -1)
                .join("/");

            const [artifacts, extension] = await this.getArtifacts(documentDir);

            if (
                await this.bpmnUiOutPort.setFormKeys(
                    editorId,
                    await this.readArtifacts(artifacts, extension),
                )
            ) {
                this.logMessageOutPort.info(`${artifacts.length} form keys are set.`);
                return true;
            } else {
                throw new Error("Setting the `formKeys` failed.");
            }
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            return false;
        }
    }

    protected async readArtifacts(
        artifacts: string[],
        extension: string,
    ): Promise<string[]> {
        const formKeys = Promise.all(
            artifacts.map(async (artifact) => {
                return getFormKey(await this.fileSystemOutPort.readFile(artifact));
            }),
        );

        return (await formKeys).filter((key): key is string => !!key);

        function getFormKey(file: string): string | undefined {
            switch (extension) {
                case ".form": {
                    // DigiWf Form
                    const json = JSON.parse(file);
                    if (json.key) {
                        return json.key as string;
                    } else {
                        return undefined;
                    }
                }
                case ".form.json": {
                    // JSON Form
                    // TODO: Implement
                    return undefined;
                }
                default:
                    return undefined;
            }
        }
    }
}

@singleton()
export class SetElementTemplatesUseCase
    extends GetArtifact
    implements SetElementTemplatesInPort
{
    protected readonly type = "element-template";

    constructor(
        @inject("BpmnUiOutPort")
        private readonly bpmnUiOutPort: BpmnUiOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigUseCase: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemUseCase: GetWorkspaceItemInPort,
        @inject("FileSystemOutPort")
        protected readonly fileSystemOutPort: FileSystemOutPort,
        @inject("ShowMessageOutPort")
        protected readonly showMessageOutPort: ShowMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {
        super();
    }

    async set(editorId: string): Promise<boolean> {
        try {
            if (editorId !== this.documentOutPort.getId()) {
                throw new Error("The `editorID` does not match the active editor.");
            }

            const documentDir = this.documentOutPort
                .getFilePath()
                .split("/")
                .slice(0, -1)
                .join("/");

            const artifacts = (await this.getArtifacts(documentDir))[0];

            if (
                await this.bpmnUiOutPort.setElementTemplates(
                    editorId,
                    await this.readArtifacts(artifacts),
                )
            ) {
                this.logMessageOutPort.info(
                    `${artifacts.length} element templates are set.`,
                );
                return true;
            } else {
                throw new Error("Setting the `elementTemplates` failed.");
            }
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            return false;
        }
    }

    protected async readArtifacts(
        artifacts: string[],
        extension?: string,
    ): Promise<string[]> {
        return Promise.all(
            artifacts.map(async (artifact) => {
                return this.fileSystemOutPort.readFile(artifact);
            }),
        );
    }
}

@singleton()
export class SetBpmnModelerSettingsUseCase implements SetBpmnModelerSettingsInPort {
    constructor(
        @inject("BpmnUiOutPort")
        private readonly bpmnUiOutPort: BpmnUiOutPort,
        @inject("BpmnModelerSettingsOutPort")
        private readonly bpmnModelerSettingsOutPort: BpmnModelerSettingsOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async set(editorId: string): Promise<boolean> {
        try {
            const settings = new SettingBuilder()
                .alignToOrigin(this.bpmnModelerSettingsOutPort.getAlignToOrigin())
                .buildBpmnModeler();

            if (await this.bpmnUiOutPort.setSettings(editorId, settings)) {
                return true;
            } else {
                throw new Error("Setting the settings failed.");
            }
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            return false;
        }
    }
}

const EMPTY_C7_BPMN_DIAGRAM = `
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_1d2hcmz" targetNamespace="http://bpmn.io/schema/bpmn" xmlns:modeler="http://camunda.org/schema/modeler/1.0" exporter="Camunda Modeler" exporterVersion="5.20.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="7.20.0">
  <bpmn:process id="Process_0gjrx3e" isExecutable="true" camunda:historyTimeToLive="180">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_0gjrx3e">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="159" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

const EMPTY_DMN_DIAGRAM = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" id="Definitions_1y42u6n" name="DRD" namespace="http://camunda.org/schema/1.0/dmn" xmlns:modeler="http://camunda.org/schema/modeler/1.0" exporter="Camunda Modeler" exporterVersion="5.8.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="7.18.0">
  <decision id="Decision_16wqg49" name="Decision 1">
    <decisionTable id="DecisionTable_1wi1sbd">
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
      <dmndi:DMNShape dmnElementRef="Decision_16wqg49">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>
`;
