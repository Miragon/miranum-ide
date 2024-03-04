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
    DisplayBpmnModelerOutPort,
    DisplayDmnModelerOutPort,
    DocumentOutPort,
    FileSystemOutPort,
    LogMessageOutPort,
    ShowMessageOutPort,
} from "../ports/out";
import {
    SettingBuilder,
    successfulMessageToBpmnModeler,
    successfulMessageToDmnModeler,
} from "../model";
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
        @inject("DisplayBpmnModelerOutPort")
        private readonly displayBpmnModelerOutPort: DisplayBpmnModelerOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async display(editorId: string): Promise<boolean> {
        try {
            if (editorId !== this.displayBpmnModelerOutPort.getId()) {
                throw new Error("The `editorID` does not match the active editor.");
            }

            const bpmnFile = this.documentOutPort.getContent();
            const regex = /modeler:executionPlatformVersion="([78])\.\d+\.\d+"/;
            const match = bpmnFile.match(regex);

            if (match) {
                const executionPlatform = match[1];
                switch (executionPlatform) {
                    case "7": {
                        successfulMessageToBpmnModeler.bpmn =
                            await this.displayBpmnModelerOutPort.displayBpmnFile(
                                editorId,
                                "c7",
                                bpmnFile,
                            );
                        break;
                    }
                   case "8": {
                        successfulMessageToBpmnModeler.bpmn =
                            await this.displayBpmnModelerOutPort.displayBpmnFile(
                                editorId,
                                "c8",
                                bpmnFile,
                            );
                        break;
                   }
                    default:
                        throw new Error(
                            `The execution platform version ${executionPlatform} is not supported.`,
                        );
                }

                if (!successfulMessageToBpmnModeler.bpmn) {
                    throw new Error("Unable to display the BPMN Modeler.");
                }
                return successfulMessageToBpmnModeler.bpmn;
            } else {
                throw new Error(
                    `Missing execution platform in BPMN file ${this.documentOutPort.getFilePath()}.`,
                );
            }
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.showMessageOutPort.error(
                `A problem occurred while trying to display the BPMN Modeler.\n
                ${(error as Error).message}`,
            );
            return (successfulMessageToBpmnModeler.bpmn = false);
        }
    }
}

@singleton()
export class DisplayDmnModelerUseCase implements DisplayDmnModelerInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("DisplayDmnModelerOutPort")
        private readonly displayDmnModelerOutPort: DisplayDmnModelerOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async display(editorId: string): Promise<boolean> {
        try {
            if (editorId !== this.displayDmnModelerOutPort.getId()) {
                throw new Error("The `editorID` does not match the active editor.");
            }

            const dmnFile = this.documentOutPort.getContent();

            successfulMessageToDmnModeler.dmn =
                await this.displayDmnModelerOutPort.displayDmnFile(editorId, dmnFile);

            if (!successfulMessageToDmnModeler.dmn) {
                throw new Error("Unable to display the DMN Modeler.");
            }
            return successfulMessageToDmnModeler.dmn;
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.showMessageOutPort.error(
                `A problem occurred while trying to display the DMN Modeler.\n
                ${(error as Error).message}`,
            );
            return (successfulMessageToDmnModeler.dmn = false);
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
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigUseCase: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemUseCase: GetWorkspaceItemInPort,
        @inject("FileSystemOutPort")
        protected readonly fileSystemOutPort: FileSystemOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("DisplayBpmnModelerOutPort")
        private readonly displayBpmnModelerOutPort: DisplayBpmnModelerOutPort,
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

            successfulMessageToBpmnModeler.formKeys =
                await this.displayBpmnModelerOutPort.setFormKeys(
                    editorId,
                    await this.readArtifacts(artifacts, extension),
                );

            if (!successfulMessageToBpmnModeler.formKeys) {
                throw new Error("Unable to set the `formKeys` for the active editor.");
            }

            return successfulMessageToBpmnModeler.formKeys;
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.showMessageOutPort.error(
                `A problem occurred while trying to set the \`formKeys\`.\n
                ${(error as Error).message}`,
            );

            return (successfulMessageToBpmnModeler.formKeys = false);
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
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigUseCase: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemUseCase: GetWorkspaceItemInPort,
        @inject("FileSystemOutPort")
        protected readonly fileSystemOutPort: FileSystemOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("DisplayBpmnModelerOutPort")
        private readonly displayBpmnModelerOutPort: DisplayBpmnModelerOutPort,
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

            successfulMessageToBpmnModeler.elementTemplates =
                await this.displayBpmnModelerOutPort.setElementTemplates(
                    editorId,
                    await this.readArtifacts(artifacts),
                );

            if (!successfulMessageToBpmnModeler.elementTemplates) {
                throw new Error(
                    "Unable to set the `element templates` for the active editor.",
                );
            }

            return successfulMessageToBpmnModeler.elementTemplates;
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.showMessageOutPort.error(
                `A problem occurred while trying to set the \`element templates\`. ${
                    (error as Error).message
                }`,
            );

            return (successfulMessageToBpmnModeler.elementTemplates = false);
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
        @inject("BpmnModelerSettingsOutPort")
        private readonly bpmnModelerSettingsOutPort: BpmnModelerSettingsOutPort,
        @inject("DisplayBpmnModelerOutPort")
        private readonly displayBpmnModelerOutPort: DisplayBpmnModelerOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async set(editorId: string): Promise<boolean> {
        try {
            const settings = new SettingBuilder()
                .alignToOrigin(this.bpmnModelerSettingsOutPort.getAlignToOrigin())
                .buildBpmnModeler();

            successfulMessageToBpmnModeler.settings =
                await this.displayBpmnModelerOutPort.setSettings(editorId, settings);

            if (!successfulMessageToBpmnModeler.bpmn) {
                throw new Error("Unable to set the settings of the active editor.");
            }
            return successfulMessageToBpmnModeler.bpmn;
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.showMessageOutPort.error(
                `A problem occurred while trying to set the settings.\n
                ${(error as Error).message}`,
            );
            return (successfulMessageToBpmnModeler.settings = false);
        }
    }
}
