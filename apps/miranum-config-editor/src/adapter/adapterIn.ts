/**
 * @module In-Adapter
 * @description In the context of the "Hexagonal Architecture", In-Adapters are objects that call our application. \
 * List of Adapters
 * - {@link WebviewAdapter}
 * - {@link DocumentAdapter}
 */
import { TextDocument, Uri, Webview, workspace } from "vscode";
import { inject, injectable } from "tsyringe";

import { EXTENSION_CONTEXT, setUpdateFrom, updateFrom, UpdateFrom } from "../common";
import {
    InitWebviewInPort,
    SyncDocumentCommand,
    SyncDocumentInPort,
    SyncWebviewInPort,
    WebviewCommand
} from "../application/portsIn";
import { ConfigEditorData, MessageType, VscMessage } from "@miranum-ide/vscode/shared/miranum-config-editor";

/**
 * @class WebviewAdapter
 */
@injectable()
export class WebviewAdapter {
    constructor(
        webview: Webview,
        document: TextDocument,
        @inject("InitWebviewInPort")
        private readonly initWebviewInPort: InitWebviewInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
    ) {
        this.initWebview(webview, document);
        this.onDidReceiveMessage(webview, document);
    }

    private initWebview(webview: Webview, document: TextDocument) {
        webview.options = { enableScripts: true };
        webview.html = getHtml(webview, EXTENSION_CONTEXT.getContext().extensionUri);
        const initWebviewCommand = new WebviewCommand(
            document.fileName,
            document.getText(),
        );
        this.initWebviewInPort.initWebview(initWebviewCommand);
    }

    private onDidReceiveMessage(webview: Webview, document: TextDocument) {
        // Sync webview with a document
        webview.onDidReceiveMessage(async (message: VscMessage<ConfigEditorData>) => {
            if (updateFrom === UpdateFrom.DOCUMENT) {
                setUpdateFrom(UpdateFrom.NULL); // reset
                return;
            }
            setUpdateFrom(UpdateFrom.WEBVIEW);

            if (message.type === MessageType.syncWebview) {
                if (message.payload?.data) {
                    const syncDocumentCommand = new SyncDocumentCommand(
                        document.fileName,
                        message.payload.data,
                    );
                    this.syncDocumentInPort.sync(syncDocumentCommand);
                }
            }
        });
    }
}

function getHtml(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, "miranum-config-editor-webview");

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));

    const nonce = getNonce();

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />

                <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    style-src ${webview.cspSource} https:;
                    img-src ${webview.cspSource} data:;
                    font-src ${webview.cspSource} data:;
                    script-src 'nonce-${nonce}';"/>

                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

                <link href="https://cdn.jsdelivr.net/npm/@mdi/font@latest/css/materialdesignicons.min.css" rel="stylesheet">
                <link href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900" rel="stylesheet">
                <link href="${styleUri}" rel="stylesheet" type="text/css" />

                <title>Miranum Config Editor</title>
            </head>
            <body>
                <div id="app"></div>
                <script type="text/javascript" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
}

function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * @class DocumentAdapter
 */
@injectable()
export class DocumentAdapter {
    constructor(
        private readonly document: TextDocument,
        @inject("SyncWebviewInPort")
        private readonly syncWebviewInPort: SyncWebviewInPort,
    ) {
        this.onDidChangeTextDocument();
    }

    private onDidChangeTextDocument() {
        // Sync document with webview
        workspace.onDidChangeTextDocument(async (event) => {
            if (event.contentChanges.length === 0) {
                return;
            }
            if (updateFrom === UpdateFrom.WEBVIEW) {
                setUpdateFrom(UpdateFrom.NULL); // reset
                return;
            }

            if (this.document.fileName === event.document.fileName) {
                const syncWebviewCommand = new WebviewCommand(
                    this.document.fileName,
                    event.document.getText(),
                );

                this.syncWebviewInPort.sync(syncWebviewCommand);
            }
        });
    }
}
