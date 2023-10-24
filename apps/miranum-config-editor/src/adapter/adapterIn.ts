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
    SyncWebviewInPort
} from "../application/portsIn";
import { ConfigEditorData, MessageType, VscMessage } from "@miranum-ide/vscode/shared/miranum-config-editor";

/**
 * @class WebviewAdapter
 */
@injectable()
export class WebviewAdapter {
    private files: Map<string, Promise<string>> | undefined;

    constructor(
        webview: Webview,
        document: TextDocument,
        @inject("ReadVsCodeConfigInPort")
        private readonly readVsCodeConfigInPort: ReadVsCodeConfigInPort,
        @inject("ReadJsonFormInPort")
        private readonly readJsonFormInPort: ReadJsonFormInPort,
        @inject("InitWebviewInPort")
        private readonly initWebviewInPort: InitWebviewInPort,
        @inject("RestoreWebviewInPort")
        private readonly restoreWebviewInPort: RestoreWebviewInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
    ) {
        this.initWebview(webview, document);
        this.onDidReceiveMessage(webview, document);
    }

    private initWebview(webview: Webview, document: TextDocument) {
        webview.options = { enableScripts: true };
        webview.html = getHtml(webview, EXTENSION_CONTEXT.getContext().extensionUri);

        const basePath = this.readVsCodeConfigInPort.readVsCodeConfig(
            new ReadVsCodeConfigQuery("miranumIDE.configEditor.basePath"),
        );
        this.files = this.readJsonFormInPort.readJsonForm(
            new ReadJsonFormQuery(document.fileName, basePath),
        );
    }

    private onDidReceiveMessage(webview: Webview, document: TextDocument) {
        // Sync webview with a document
        webview.onDidReceiveMessage(async (message: VscMessage<ConfigEditorData>) => {
            if (updateFrom === UpdateFrom.DOCUMENT) {
                setUpdateFrom(UpdateFrom.NULL); // reset
                return;
            }
            setUpdateFrom(UpdateFrom.WEBVIEW);

            switch (message.type) {
                case MessageType.initialize: {
                    if (!this.files) {
                        throw new Error("Files are not initialized");
                    }

                    const initWebviewCommand = new InitWebviewCommand(
                        document.fileName,
                        (await this.files.get("schema")) ?? "",
                        (await this.files.get("uischema")) ?? "",
                        document.getText(),
                    );

                    this.initWebviewInPort.initWebview(initWebviewCommand);
                    break;
                }
                case MessageType.restore: {
                    // TODO:
                    //  Implement logic if user edited the document or the JSON schema and uischema
                    //  while the webview was in background.
                    const restoreWebviewCommand = new RestoreWebviewCommand(
                        document.fileName,
                        "",
                    );
                    this.restoreWebviewInPort.restore(restoreWebviewCommand);
                    break;
                }
                case MessageType.syncDocument: {
                    if (message.payload?.data) {
                        const syncDocumentCommand = new SyncDocumentCommand(
                            document.fileName,
                            JSON.stringify(
                                JSON.parse(message.payload.data),
                                undefined,
                                2,
                            ),
                        );
                        this.syncDocumentInPort.sync(syncDocumentCommand);
                    }
                    break;
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
                    style-src ${webview.cspSource} https: 'unsafe-inline';
                    img-src ${webview.cspSource} data:;
                    font-src ${webview.cspSource} https:;
                    script-src 'nonce-${nonce}' 'unsafe-eval';"/>

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
                const syncWebviewCommand = new SyncWebviewCommand(
                    this.document.fileName,
                    event.document.getText(),
                );

                this.syncWebviewInPort.sync(syncWebviewCommand);
            }
        });
    }
}
