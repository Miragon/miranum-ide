import { inject, singleton } from "tsyringe";

import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

import {
    DisplayModelerInPort,
    GetMiranumConfigInPort,
    GetWorkspaceItemInPort,
    SetArtifactInPort,
    SetModelerSettingInPort,
} from "../ports/in";
import {
    BpmnModelerSettingsOutPort,
    BpmnUiOutPort,
    DisplayMessageOutPort,
    DmnUiOutPort,
    DocumentOutPort,
    FileSystemOutPort,
    GetExecutionPlatformVersionOutPort,
    LogMessageOutPort,
} from "../ports/out";
import { SettingBuilder } from "../model";
import {
    FileNotFound,
    NoMiranumWorkspaceItemError,
    NoWorkspaceFolderFoundError,
} from "../errors";

@singleton()
export class DisplayBpmnModelerUseCase implements DisplayModelerInPort {
    constructor(
        @inject("C7ExecutionPlatformVersion")
        private readonly c7ExecutionPlatformVersion: string,
        @inject("C8ExecutionPlatformVersion")
        private readonly c8ExecutionPlatformVersion: string,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("BpmnUiOutPort")
        private readonly bpmnUiOutPort: BpmnUiOutPort,
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("GetExecutionPlatformVersionOutPort")
        private readonly getExecutionPlatformVersionOutPort: GetExecutionPlatformVersionOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async display(editorId: string): Promise<boolean> {
        if (editorId !== this.bpmnUiOutPort.getId()) {
            return this.handleError(
                new Error("The `editorID` does not match the active editor."),
            );
        }

        try {
            let bpmnFile = this.documentOutPort.getContent();

            if (bpmnFile === "") {
                // If a new and empty BPMN file is created, the C7 Modeler will be displayed.
                bpmnFile = EMPTY_C7_BPMN_DIAGRAM;
                this.documentOutPort.write(bpmnFile);
            }

            try {
                return await this.bpmnUiOutPort.displayBpmnFile(
                    editorId,
                    this.detectExecutionPlatform(bpmnFile),
                    bpmnFile,
                );
            } catch (error) {
                const ep =
                    await this.getExecutionPlatformVersionOutPort.getExecutionPlatformVersion();
                const newBpmnFile =
                    ep === "c7"
                        ? addExecutionPlatform(
                              bpmnFile,
                              "Camunda Platform",
                              this.c7ExecutionPlatformVersion,
                          )
                        : addExecutionPlatform(
                              bpmnFile,
                              "Camunda Cloud",
                              this.c8ExecutionPlatformVersion,
                          );

                await this.bpmnUiOutPort.displayBpmnFile(editorId, ep, newBpmnFile);

                return await this.documentOutPort.write(newBpmnFile);
            }
        } catch (error) {
            return this.handleError(error as Error);
        }
    }

    private handleError(error: Error): boolean {
        this.logMessageOutPort.error(error as Error);
        this.displayMessageOutPort.error(
            `A problem occurred while trying to display the BPMN Modeler.\n${
                (error as Error).message ?? error
            }`,
        );
        return false;
    }

    private detectExecutionPlatform(bpmnFile: string): "c7" | "c8" {
        const regexExecutionPlatform =
            /modeler:executionPlatformVersion="([78])\.\d+\.\d+"/;
        const matchExecutionPlatformVersion = bpmnFile.match(regexExecutionPlatform);

        if (matchExecutionPlatformVersion) {
            switch (matchExecutionPlatformVersion?.[1]) {
                case "7": {
                    return "c7";
                }
                case "8": {
                    return "c8";
                }
                default:
                    throw new Error(
                        `The execution platform version ${matchExecutionPlatformVersion[1]} is not supported.`,
                    );
            }
        } else {
            const regexZebee = /xmlns:zeebe=".*"/;
            const regexCamunda = /xmlns:camunda=".*"/;

            if (bpmnFile.match(regexCamunda)) {
                return "c7";
            } else if (bpmnFile.match(regexZebee)) {
                return "c8";
            } else {
                throw new Error("The execution platform could not be detected.");
            }
        }
    }
}

@singleton()
export class DisplayDmnModelerUseCase implements DisplayModelerInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("DmnUiOutPort")
        private readonly dmnUiOutPort: DmnUiOutPort,
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async display(editorId: string): Promise<boolean> {
        if (editorId !== this.dmnUiOutPort.getId()) {
            return this.handleError(
                new Error("The `editorID` does not match the active editor."),
            );
        }

        try {
            let dmnFile = this.documentOutPort.getContent();

            if (dmnFile === "") {
                dmnFile = EMPTY_DMN_DIAGRAM;
                this.documentOutPort.write(dmnFile);
            }

            return await this.dmnUiOutPort.displayDmnFile(editorId, dmnFile);
        } catch (error) {
            return this.handleError(error as Error);
        }
    }

    private handleError(error: Error): boolean {
        this.logMessageOutPort.error(error as Error);
        this.displayMessageOutPort.error(
            `A problem occurred while trying to display the BPMN Modeler.\n${
                (error as Error).message ?? error
            }`,
        );
        return false;
    }
}

abstract class GetArtifact {
    protected abstract type: string;

    protected abstract getMiranumConfigInPort: GetMiranumConfigInPort;

    protected abstract getWorkspaceItemInPort: GetWorkspaceItemInPort;

    protected abstract displayMessageOutPort: DisplayMessageOutPort;

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
            return await this.getMiranumConfigInPort.get(documentPath);
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
            return this.getWorkspaceItemInPort.getDefaultByType(type);
        }

        try {
            return await this.getWorkspaceItemInPort.getByType(miranumConfigPath, type);
        } catch (error) {
            const root = miranumConfigPath.replace("/miranum.json", "");
            const defaultMessage = `Default workspace is used. You can save element templates in \`${root}/element-templates\` and forms in \`${root}/forms\``;

            if (error instanceof FileNotFound) {
                this.displayMessageOutPort.info(
                    `The \`miranum.json\` file is missing!\n${defaultMessage}.`,
                );
            } else if (error instanceof SyntaxError) {
                this.displayMessageOutPort.info(
                    `The \`miranum.json\` file has incorrect JSON!\n${defaultMessage}.`,
                );
            } else if (error instanceof NoMiranumWorkspaceItemError) {
                this.displayMessageOutPort.info(`${error.message}!\n${defaultMessage}.`);
            } else {
                this.displayMessageOutPort.info(
                    `${(error as Error).message}!\n${defaultMessage}.`,
                );
            }
            return this.getWorkspaceItemInPort.getDefaultByType(type);
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
export class SetFormKeysUseCase extends GetArtifact implements SetArtifactInPort {
    protected readonly type = "form";

    constructor(
        @inject("BpmnUiOutPort")
        private readonly bpmnUiOutPort: BpmnUiOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigInPort: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemInPort: GetWorkspaceItemInPort,
        @inject("FileSystemOutPort")
        protected readonly fileSystemOutPort: FileSystemOutPort,
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {
        super();
    }

    async set(editorId: string): Promise<boolean> {
        if (editorId !== this.documentOutPort.getId()) {
            return this.handleError(
                new Error("The `editorID` does not match the active editor."),
            );
        }

        try {
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
                return this.handleError(new Error("Setting the `formKeys` failed."));
            }
        } catch (error) {
            return this.handleError(error as Error);
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

    private handleError(error: Error): boolean {
        this.logMessageOutPort.error(error as Error);
        return false;
    }
}

@singleton()
export class SetElementTemplatesUseCase
    extends GetArtifact
    implements SetArtifactInPort
{
    protected readonly type = "element-template";

    constructor(
        @inject("BpmnUiOutPort")
        private readonly bpmnUiOutPort: BpmnUiOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigInPort: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemInPort: GetWorkspaceItemInPort,
        @inject("FileSystemOutPort")
        protected readonly fileSystemOutPort: FileSystemOutPort,
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {
        super();
    }

    async set(editorId: string): Promise<boolean> {
        if (editorId !== this.documentOutPort.getId()) {
            return this.handleError(
                new Error("The `editorID` does not match the active editor."),
            );
        }

        try {
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
                return this.handleError(
                    new Error("Setting the `elementTemplates` failed."),
                );
            }
        } catch (error) {
            return this.handleError(error as Error);
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

    private handleError(error: Error): boolean {
        this.logMessageOutPort.error(error as Error);
        return false;
    }
}

@singleton()
export class SetBpmnModelerSettingsUseCase implements SetModelerSettingInPort {
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
                return this.handleError(new Error("Unable to set preferences."));
            }
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            return false;
        }
    }

    private handleError(error: Error): boolean {
        this.logMessageOutPort.error(error as Error);
        return false;
    }
}

export function addExecutionPlatform(
    bpmnFile: string,
    executionPlatform: string,
    executionPlatformVersion: string,
): string {
    const regex = /<bpmn:definitions[^>]*>/;
    const match = bpmnFile.match(regex);

    const insert = `modeler:executionPlatform="${executionPlatform}" modeler:executionPlatformVersion="${executionPlatformVersion}">`;

    if (match) {
        const definition = match[0].split(" ");
        if (definition[definition.length - 1].endsWith(">")) {
            definition[definition.length - 1] = definition[
                definition.length - 1
            ].replace(">", "");
            definition.push(insert);
        }
        return bpmnFile.replace(regex, `${definition.join(" ")}`);
    } else {
        throw new Error("The BPMN file does not contain a `bpmn:definitions` tag.");
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
