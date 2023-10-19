/**
 * @module UseCases
 * @description Here we implement our Business Logic. \
 * **There are no dependencies outside the application folder.** \
 * List of Use Cases:
 * - {@link InitWebviewUseCase}
 * - {@link SyncWebviewUseCase}
 * - {@link SyncDocumentUseCase}
 */
import { inject, injectable } from "tsyringe";

import {
    InitWebviewInPort,
    SyncDocumentCommand,
    SyncDocumentInPort,
    SyncWebviewInPort,
    WebviewCommand
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
        @inject("ReaderOutPort") private readonly readerOutPort: ReaderOutPort,
        @inject("VsCodeConfigOutPort")
        private readonly vsCodeConfigOutPort: VsCodeConfigOutPort,
    ) {}

    async initWebview(initWebviewCommand: WebviewCommand): Promise<boolean> {
        try {
            // TODO: What to do when basePath is undefined?
            const basePath = this.vsCodeConfigOutPort.getConfiguration<string>(
                "miranumIDE.configEditor.basePath",
            );
            const fileName = initWebviewCommand.webviewId;
            const extension = fileName.substring(fileName.indexOf("."), fileName.length);
            const schema = await this.readerOutPort.readFile(
                `${basePath}/schema${extension}`,
            );
            const uischema = await this.readerOutPort.readFile(
                `${basePath}/uischema${extension}`,
            );
            const files = await Promise.all([schema, uischema]);
            const message: VscMessage<ConfigEditorData> = {
                type: MessageType.initialize,
                payload: {
                    schema: files[0],
                    uischema: files[1],
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

    async sync(syncWebviewCommand: WebviewCommand): Promise<boolean> {
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
            return this.documentOutPort.save(syncDocumentCommand.fileName);
        }
        // Handle error
        return false;
    }
}
