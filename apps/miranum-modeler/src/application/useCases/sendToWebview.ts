import { inject, singleton } from "tsyringe";

import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    DisplayElementTemplatesInPort,
    DisplayFormKeysInPort,
    GetMiranumConfigInPort,
    GetWorkspaceItemInPort,
} from "../ports/in";
import {
    DocumentOutPort,
    SendToBpmnModelerOutPort,
    SendToDmnModelerOutPort,
    ShowMessageOutPort,
    VsCodeReadOutPort,
} from "../ports/out";
import { successfulMessageToBpmnModeler, successfulMessageToDmnModeler } from "../model";
import {
    FileNotFound,
    NoMiranumWorkspaceItemError,
    NoWorkspaceFolderFoundError,
} from "../errors";
import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

@singleton()
export class DisplayBpmnFileUseCase implements DisplayBpmnModelerInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("SendToBpmnModelerOutPort")
        private readonly sendToBpmnModelerOutPort: SendToBpmnModelerOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
    ) {}

    async displayBpmnFile(): Promise<boolean> {
        try {
            let executionPlatform: string;
            const webviewId = this.documentOutPort.getFilePath();
            const bpmnFile = this.documentOutPort.getContent();

            const regex = /modeler:executionPlatformVersion="([78])\.\d+\.\d+"/;
            const match = bpmnFile.match(regex);

            if (match) {
                executionPlatform = match[1];
                successfulMessageToBpmnModeler.bpmn =
                    await this.sendToBpmnModelerOutPort.sendBpmnFile(
                        webviewId,
                        executionPlatform,
                        bpmnFile,
                    );
                if (!successfulMessageToBpmnModeler.bpmn) {
                    // TODO: Log the error
                    this.showMessageOutPort.showErrorMessage(
                        "A problem occurred while trying to display the BPMN file.",
                    );
                }
                return successfulMessageToBpmnModeler.bpmn;
            } else {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    `Execution platform version not found!`,
                );
                return false;
            }
        } catch (error) {
            // TODO: Log the error
            this.showMessageOutPort.showErrorMessage(
                `A problem occurred while trying to display the BPMN file.\n
                ${(error as Error).message}`,
            );
            return false;
        }
    }
}

@singleton()
export class SendToDmnModelerUseCase implements DisplayDmnModelerInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("SendToDmnModelerOutPort")
        private readonly sendToWebviewOutPort: SendToDmnModelerOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
    ) {}

    async displayDmnFile(): Promise<boolean> {
        try {
            const webviewId = this.documentOutPort.getFilePath();
            const dmnFile = this.documentOutPort.getContent();

            successfulMessageToDmnModeler.dmn =
                await this.sendToWebviewOutPort.sendDmnFile(webviewId, dmnFile);

            if (!successfulMessageToDmnModeler.dmn) {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    "A problem occurred while trying to display the DMN file.",
                );
            }
            return successfulMessageToDmnModeler.dmn;
        } catch (error) {
            // TODO: Log the error
            this.showMessageOutPort.showErrorMessage(
                `A problem occurred while trying to display the DMN file.\n
                ${(error as Error).message}`,
            );
            return false;
        }
    }
}

abstract class DisplayArtifact {
    protected abstract type: string;

    protected abstract getMiranumConfigUseCase: GetMiranumConfigInPort;

    protected abstract getWorkspaceItemUseCase: GetWorkspaceItemInPort;

    protected abstract showMessageOutPort: ShowMessageOutPort;

    protected abstract vsCodeReadOutPort: VsCodeReadOutPort;

    async getArtifacts(documentPath: string): Promise<[string[], string]> {
        const miranumConfigPath = await getMiranumConfig(
            documentPath,
            this.getMiranumConfigUseCase,
        );

        // FIXME: The type is hardcoded but depends on the config
        const workspaceItem = await getWorkspaceItem(
            miranumConfigPath,
            this.type,
            this.getWorkspaceItemUseCase,
            this.showMessageOutPort,
        );

        return [
            await readDirectory(
                miranumConfigPath?.replace("miranum.json", workspaceItem.path) ??
                    `${documentPath}/${workspaceItem.path}`,
                workspaceItem.extension,
                this.vsCodeReadOutPort,
            ),
            workspaceItem.extension,
        ];
    }

    protected abstract readArtifacts(
        artifacts: string[],
        extension?: string,
    ): Promise<string[]>;
}

@singleton()
export class DisplayFormKeysUseCase
    extends DisplayArtifact
    implements DisplayFormKeysInPort
{
    protected readonly type = "form";

    constructor(
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigUseCase: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemUseCase: GetWorkspaceItemInPort,
        @inject("VsCodeReadOutPort")
        protected readonly vsCodeReadOutPort: VsCodeReadOutPort,
        @inject("ShowMessageOutPort")
        protected readonly showMessageOutPort: ShowMessageOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("SendToBpmnModelerOutPort")
        private readonly sendToBpmnModelerOutPort: SendToBpmnModelerOutPort,
    ) {
        super();
    }

    async sendFormKeys(): Promise<boolean> {
        try {
            const document = this.documentOutPort.getFilePath();
            const documentPath = document.split("/").slice(0, -1).join("/");

            const [artifacts, extension] = await this.getArtifacts(documentPath);

            successfulMessageToBpmnModeler.formKeys =
                await this.sendToBpmnModelerOutPort.sendFormKeys(
                    document,
                    await this.readArtifacts(artifacts, extension),
                );

            if (!successfulMessageToBpmnModeler.formKeys) {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    "A problem occurred! `Form Keys` will not be selectable.",
                );
            }

            return successfulMessageToBpmnModeler.formKeys;
        } catch (error) {
            // TODO: Log the error
            successfulMessageToBpmnModeler.formKeys = false;
            return successfulMessageToBpmnModeler.formKeys;
        }
    }

    protected async readArtifacts(
        artifacts: string[],
        extension: string,
    ): Promise<string[]> {
        const formKeys = Promise.all(
            artifacts.map(async (artifact) => {
                return getFormKey(await this.vsCodeReadOutPort.readFile(artifact));
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
export class DisplayElementTemplatesUseCase
    extends DisplayArtifact
    implements DisplayElementTemplatesInPort
{
    protected readonly type = "element-template";

    constructor(
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigUseCase: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemUseCase: GetWorkspaceItemInPort,
        @inject("VsCodeReadOutPort")
        protected readonly vsCodeReadOutPort: VsCodeReadOutPort,
        @inject("ShowMessageOutPort")
        protected readonly showMessageOutPort: ShowMessageOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("SendToBpmnModelerOutPort")
        private readonly sendToBpmnModelerOutPort: SendToBpmnModelerOutPort,
    ) {
        super();
    }

    async sendElementTemplates(): Promise<boolean> {
        try {
            const document = this.documentOutPort.getFilePath();
            const documentPath = document.split("/").slice(0, -1).join("/");

            const artifacts = (await this.getArtifacts(documentPath))[0];

            successfulMessageToBpmnModeler.elementTemplates =
                await this.sendToBpmnModelerOutPort.sendElementTemplates(
                    document,
                    await this.readArtifacts(artifacts),
                );

            if (!successfulMessageToBpmnModeler.elementTemplates) {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    "A problem occurred! `Form Keys` will not be selectable.",
                );
            }

            return successfulMessageToBpmnModeler.elementTemplates;
        } catch (error) {
            // TODO: Log the error
            successfulMessageToBpmnModeler.elementTemplates = false;
            return successfulMessageToBpmnModeler.elementTemplates;
        }
    }

    protected async readArtifacts(
        artifacts: string[],
        extension?: string,
    ): Promise<string[]> {
        return Promise.all(
            artifacts.map(async (artifact) => {
                return this.vsCodeReadOutPort.readFile(artifact);
            }),
        );
    }
}

async function getMiranumConfig(
    documentPath: string,
    service: GetMiranumConfigInPort,
): Promise<string | undefined> {
    try {
        return await service.getMiranumConfig(documentPath);
    } catch (error) {
        if (error instanceof NoWorkspaceFolderFoundError) {
            return documentPath;
        }
        return undefined;
    }
}

async function getWorkspaceItem(
    miranumConfigPath: string | undefined,
    type: string,
    getWorkspaceItemService: GetWorkspaceItemInPort,
    showMessageService: ShowMessageOutPort,
): Promise<MiranumWorkspaceItem> {
    if (!miranumConfigPath) {
        return getWorkspaceItemService.getDefaultWorkspaceItemByType(type);
    }

    try {
        // FIXME: The type is hardcoded but depends on the config
        return await getWorkspaceItemService.getWorkspaceItemByType(
            miranumConfigPath,
            type,
        );
    } catch (error) {
        const root = miranumConfigPath.replace("/miranum.json", "");
        const defaultMessage = `Default workspace is used. You can save element templates in \`${root}/element-templates\` and forms in \`${root}/forms\``;

        if (error instanceof FileNotFound) {
            showMessageService.showInfoMessage(
                `The \`miranum.json\` file is missing!\n${defaultMessage}.`,
            );
        } else if (error instanceof SyntaxError) {
            showMessageService.showInfoMessage(
                `The \`miranum.json\` file has incorrect JSON!\n${defaultMessage}.`,
            );
        } else if (error instanceof NoMiranumWorkspaceItemError) {
            showMessageService.showInfoMessage(`${error.message}!\n${defaultMessage}.`);
        } else {
            showMessageService.showInfoMessage(
                `${(error as Error).message}!\n${defaultMessage}.`,
            );
        }
        return getWorkspaceItemService.getDefaultWorkspaceItemByType(type);
    }
}

async function readDirectory(
    folder: string,
    extension: string,
    service: VsCodeReadOutPort,
): Promise<string[]> {
    const ws = await service.readDirectory(folder);

    const files: string[] = [];
    for (const [name, type] of ws) {
        if (type === "directory") {
            files.push(
                ...(await readDirectory(`${folder}/${name}`, extension, service)),
            );
        } else if (type === "file" && name.endsWith(extension)) {
            files.push(`${folder}/${name}`);
        }
    }
    return files;
}
