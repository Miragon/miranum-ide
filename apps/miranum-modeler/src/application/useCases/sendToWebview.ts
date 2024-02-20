import { inject, singleton } from "tsyringe";

import {
    DisplayBpmnModelerArtifactInPort,
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
} from "../ports/in";
import {
    ArtifactOutPort,
    DocumentOutPort,
    SendToBpmnModelerOutPort,
    SendToDmnModelerOutPort,
    ShowMessageOutPort,
    VsCodeReadOutPort,
    WorkspaceOutPort,
} from "../ports/out";
import {
    defaultFormConfig,
    successfulMessageToBpmnModeler,
    successfulMessageToDmnModeler,
} from "../model";
import {
    FileNotFound,
    NoMiranumConfigFoundError,
    NoWorkspaceFolderFoundError,
} from "../errors";
import { MiranumConfig, MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

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
export class DisplayArtifactsUseCase implements DisplayBpmnModelerArtifactInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("WorkspaceOutPort")
        private readonly workspaceOutPort: WorkspaceOutPort,
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
        @inject("ArtifactOutPort")
        private readonly artifactOutPort: ArtifactOutPort,
        @inject("SendToBpmnModelerOutPort")
        private readonly sendToBpmnModelerOutPort: SendToBpmnModelerOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
    ) {}

    async sendFormKeys(): Promise<boolean> {
        try {
            const document = this.documentOutPort.getFilePath();
            const miranumConfigPath = await this.getMiranumConfigFile(document);

            // TODO: The type is hardcoded but depends on the config
            const workspaceItem =
                (await this.getWorkspaceItem("form", miranumConfigPath)) ??
                defaultFormConfig;

            const formFiles = await this.artifactOutPort.getFiles(
                miranumConfigPath.replace("/miranum.json", workspaceItem.path),
                workspaceItem.extension,
            );

            successfulMessageToBpmnModeler.formKeys =
                await this.sendToBpmnModelerOutPort.sendFormKeys(document, formKeys);

            if (!successfulMessageToBpmnModeler.formKeys) {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    "A problem occurred! `Form Keys` will not be selectable.",
                );
            }

            return successfulMessageToBpmnModeler.formKeys;
        } catch (error) {
            // TODO: Log the error
            return false;
        }
    }

    async sendElementTemplates(): Promise<boolean> {}

    private async getMiranumConfigFile(document: string): Promise<string> {
        try {
            const files =
                await this.workspaceOutPort.getMiranumConfigForDocument(document);
            switch (files.length) {
                case 0:
                    return document.split("/").slice(0, -1).join("/") + "/miranum.json";
                case 1:
                    return files[0];
                default:
                    // FIXME: What to do if there are multiple miranum.json files?
                    //  - User select one
                    //  - The files get merged
                    return files[0];
            }
        } catch (error) {
            if (error instanceof NoWorkspaceFolderFoundError) {
                return document.split("/").slice(0, -1).join("/") + "/miranum.json";
            } else {
                throw error;
            }
        }
    }

    private async getWorkspaceItem(
        type: string,
        miranumConfigPath: string,
    ): Promise<MiranumWorkspaceItem | undefined> {
        try {
            const miranumConfig: MiranumConfig = JSON.parse(
                await this.vsCodeReadOutPort.readFile(miranumConfigPath),
            );
            const workspaceItem = miranumConfig.workspace.find(
                (item) => item.type === type,
            );

            if (!workspaceItem) {
                throw new NoMiranumConfigFoundError(type);
            }

            return workspaceItem;
        } catch (error) {
            const root = miranumConfigPath.replace("/miranum.json", "");
            const defaultMessage = `Default workspace is used. You can save element templates in \`${root}/element-templates\` and forms in \`${root}/forms\``;
            if (error instanceof FileNotFound) {
                this.showMessageOutPort.showInfoMessage(
                    `The \`miranum.json\` file is missing!\n${defaultMessage}.`,
                );
            } else if (error instanceof SyntaxError) {
                this.showMessageOutPort.showInfoMessage(
                    `The \`miranum.json\` file has incorrect JSON!\n${defaultMessage}.`,
                );
            } else if (error instanceof NoMiranumConfigFoundError) {
                this.showMessageOutPort.showInfoMessage(
                    `${error.message}!\n${defaultMessage}.`,
                );
            } else {
                this.showMessageOutPort.showInfoMessage(
                    `${(error as Error).message}!\n${defaultMessage}.`,
                );
            }
            return undefined;
        }
    }
}

// @singleton()
// export class SendToBpmnModelerUseCase implements DisplayBpmnModelerInPort {
//     constructor(
//         @inject("DocumentOutPort")
//         private readonly documentOutPort: DocumentOutPort,
//         @inject("ReadArtifactOutPort")
//         private readonly readArtifactOutPort: ArtifactOutPort,
//         @inject("SendToWebviewOutPort")
//         private readonly sendToWebviewOutPort: SendToBpmnModelerOutPort,
//         @inject("ShowMessageOutPort")
//         private readonly showMessageOutPort: ShowMessageOutPort,
//     ) {}
//
//     async sendFormKeys(): Promise<boolean> {
//         try {
//             const webviewId = this.documentOutPort.getFilePath();
//
//             const formConfig = miranumWorkspaceConfig.getConfig("form");
//             const formFiles = await this.readArtifactOutPort.getFiles();
//             const formKeys = await this.readFormKeysOutPort.readFormKeys();
//
//             successfulMessageToBpmnModeler.formKeys =
//                 await this.sendToWebviewOutPort.sendFormKeys(webviewId, formKeys);
//
//             if (!successfulMessageToBpmnModeler.formKeys) {
//                 // TODO: Log the error
//                 this.showMessageOutPort.showErrorMessage(
//                     "A problem occurred! `Form Keys` will not be selectable.",
//                 );
//             }
//
//             return successfulMessageToBpmnModeler.formKeys;
//         } catch (error) {
//             // TODO: Log the error
//             if (error instanceof NoMiranumConfigFoundError) {
//                 this.showMessageOutPort.showErrorMessage(
//                     "No configuration for type `form` found in `miranum.json`.",
//                 );
//             }
//             return false;
//         }
//     }
//
//     async sendElementTemplates(): Promise<boolean> {
//         try {
//             const webviewId = this.documentOutPort.getFilePath();
//             const elementTemplates =
//                 await this.readElementTemplateOutPort.readElementTemplates();
//
//             successfulMessageToBpmnModeler.elementTemplates =
//                 await this.sendToWebviewOutPort.sendElementTemplates(
//                     webviewId,
//                     elementTemplates,
//                 );
//
//             if (!successfulMessageToBpmnModeler.elementTemplates) {
//                 // TODO: Log the error
//                 this.showMessageOutPort.showErrorMessage(
//                     "A problem occurred! `Element Templates` will not be selectable.",
//                 );
//             }
//
//             return successfulMessageToBpmnModeler.elementTemplates;
//         } catch (error) {
//             // TODO: Log the error
//             if (error instanceof NoMiranumConfigFoundError) {
//                 this.showMessageOutPort.showErrorMessage(
//                     "No configuration for type `element-template` found in `miranum.json`.",
//                 );
//             }
//             return false;
//         }
//     }
// }

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

    async sendDmnFile(): Promise<boolean> {
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
