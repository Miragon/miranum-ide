/**
 * @module UseCases
 * @description Here we implement our Business Logic. \
 * **There are no dependencies outside the application folder.** \
 * List of Use Cases:
 * - {@link InitWebviewUseCase}
 * - {@link SyncWebviewUseCase}
 * - {@link SyncDocumentUseCase}
 * - {@link ReadVsCodeConfigUseCase}
 * - {@link ReadJsonFormUseCase}
 * - {@link RestoreWebviewUseCase}
 */
import { inject, injectable } from "tsyringe";

import {
    InitWebviewCommand,
    InitWebviewInPort,
    ReadJsonFormInPort,
    ReadJsonFormQuery,
    ReadVsCodeConfigInPort,
    ReadVsCodeConfigQuery,
    RestoreWebviewCommand,
    RestoreWebviewInPort,
    SyncDocumentCommand,
    SyncDocumentInPort,
    SyncWebviewCommand,
    SyncWebviewInPort,
} from "./portsIn";
import { DocumentOutPort, ReaderOutPort, VsCodeConfigOutPort, WebviewOutPort } from "./portsOut";
import { ConfigEditorData, MessageType, VscMessage } from "@miranum-ide/vscode/shared/miranum-config-editor";

/**
 * @class InitWebviewUseCase
 * @description This use case takes care of the initialization of the webview.
 */
@injectable()
export class InitWebviewUseCase implements InitWebviewInPort {
    constructor(
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {}

    async initWebview(initWebviewCommand: InitWebviewCommand): Promise<boolean> {
        try {
            const message: VscMessage<ConfigEditorData> = {
                type: MessageType.initialize,
                payload: {
                    schema: initWebviewCommand.jsonSchema,
                    uischema: initWebviewCommand.jsonUiSchema,
                    data: initWebviewCommand.content,
                },
            };
            if (
                await this.webviewOutPort.postMessage(
                    initWebviewCommand.webviewId,
                    message,
                )
            ) {
                return true;
            }
            // e.g., add retry logic
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}

/**
 * @class SyncWebviewUseCase
 * @description This use case takes care of the synchronization of the webview with the document.
 */
@injectable()
export class SyncWebviewUseCase implements SyncWebviewInPort {
    constructor(@inject("WebviewOutPort") private webviewPort: WebviewOutPort) {}

    async sync(syncWebviewCommand: SyncWebviewCommand): Promise<boolean> {
        try {
            const message: VscMessage<ConfigEditorData> = {
                type: MessageType.syncWebview,
                payload: {
                    data: syncWebviewCommand.content,
                },
            };
            if (
                await this.webviewPort.postMessage(syncWebviewCommand.webviewId, message)
            ) {
                return true;
            }
            // e.g., add retry logic
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}

/**
 * @class SyncDocumentUseCase
 * @description This use case takes care of the synchronization of the document with the webview.
 */
@injectable()
export class SyncDocumentUseCase implements SyncDocumentInPort {
    constructor(
        @inject("DocumentOutPort") private readonly documentOutPort: DocumentOutPort,
    ) {}

    async sync(syncDocumentCommand: SyncDocumentCommand): Promise<boolean> {
        if (
            await this.documentOutPort.write(
                syncDocumentCommand.fileName,
                syncDocumentCommand.content,
            )
        ) {
            return true;
        }
        // Handle error
        return false;
    }
}

/**
 * @class ReadVsCodeConfigUseCase
 * @description This use case takes care of reading the VSCode configuration.
 */
@injectable()
export class ReadVsCodeConfigUseCase implements ReadVsCodeConfigInPort {
    constructor(
        @inject("VsCodeConfigOutPort")
        private readonly vsCodeConfigOutPort: VsCodeConfigOutPort,
    ) {}

    readVsCodeConfig(readVsCodeConfigQuery: ReadVsCodeConfigQuery): string {
        // TODO: What to do when basePath is undefined?
        const basePath = this.vsCodeConfigOutPort.getConfiguration<string>(
            readVsCodeConfigQuery.key,
        );

        return basePath ?? "";
    }
}

/**
 * @class ReadJsonFormUseCase
 * @description This use case takes care of reading the JSON Schema and UI-Schema.
 */
@injectable()
export class ReadJsonFormUseCase implements ReadJsonFormInPort {
    constructor(
        @inject("ReaderOutPort") private readonly readerOutPort: ReaderOutPort,
    ) {}

    readJsonForm(readJsonFormQuery: ReadJsonFormQuery): Map<string, Promise<string>> {
        // The filename consists of the following parts.
        // name   | type  | extension
        // my-form.process.config.json
        const fileName = readJsonFormQuery.fileName;
        const basePath = readJsonFormQuery.basePath;

        const type = fileName.split(".").slice(-3, 2)[0];

        const schema = this.readerOutPort.readFile(`${basePath}/${type}.schema.json`);
        const uischema = this.readerOutPort.readFile(
            `${basePath}/${type}.uischema.json`,
        );

        return new Map([
            ["schema", schema],
            ["uischema", uischema],
        ]);
    }
}

/**
 * @class RestoreWebviewUseCase
 * @description This use case takes care of restoring the webview.
 */
@injectable()
export class RestoreWebviewUseCase implements RestoreWebviewInPort {
    constructor(
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {}

    async restore(restoreWebviewCommand: RestoreWebviewCommand): Promise<boolean> {
        try {
            const message: VscMessage<ConfigEditorData> = {
                type: MessageType.restore,
                payload: {
                    data: restoreWebviewCommand.content,
                },
            };
            if (
                await this.webviewOutPort.postMessage(
                    restoreWebviewCommand.webviewId,
                    message,
                )
            ) {
                return true;
            }
            // e.g., add retry logic
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
