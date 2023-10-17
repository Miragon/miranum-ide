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
    InitWebviewCommand,
    InitWebviewInPort,
    SyncDocumentCommand,
    SyncDocumentInPort,
    SyncWebviewCommand,
    SyncWebviewInPort
} from "./portsIn";
import { DocumentOutPort, WebviewOutPort } from "./portsOut";

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
            if (
                await this.webviewOutPort.postMessage(
                    initWebviewCommand.webviewId,
                    initWebviewCommand.message,
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
            if (
                await this.webviewPort.postMessage(
                    syncWebviewCommand.webviewId,
                    syncWebviewCommand.message,
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
