import { Uri, ViewColumn, Webview, WebviewPanel, window } from "vscode";
import { singleton } from "tsyringe";
import {
    LoggerMessage,
    MessageType,
    VscMessage,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import { EXTENSION_CONTEXT } from "../common";
import { ConsoleMessageType, MiranumConsoleDto } from "./api";
import { WebviewAdapter } from "./in";

const webviewPath = "miranum-console-v2-webview";

@singleton()
export class WelcomeView {
    private readonly viewType = "miranum-console";

    private panel?: WebviewPanel;

    private webview?: Webview;

    constructor(private readonly webviewAdapter: WebviewAdapter) {}

    create() {
        this.panel = window.createWebviewPanel(
            this.viewType,
            "Miranum IDE",
            ViewColumn.One,
            {
                enableScripts: true,
            },
        );

        this.webview = this.panel.webview;
        this.webview.html = this.getHtml(EXTENSION_CONTEXT.getContext().extensionUri);

        this.onDidReceiveMessage();
        return true;
    }

    dispose() {
        this.panel?.dispose();
        return true;
    }

    async postMessage(message: VscMessage<unknown>) {
        if (!this.webview) {
            throw new Error("Webview is not initialized");
        }

        return (await this.webview.postMessage(message)) ?? false;
    }

    private onDidReceiveMessage() {
        if (!this.webview) {
            throw new Error("Webview is not initialized");
        }

        this.webview.onDidReceiveMessage(
            async (message: MiranumConsoleDto | LoggerMessage) => {
                if (message instanceof LoggerMessage) {
                    switch (message.type) {
                        case MessageType.INFO: {
                            console.log(message.log);
                            break;
                        }
                        case MessageType.ERROR: {
                            console.error(message.log);
                            break;
                        }
                    }
                }

                if (message instanceof MiranumConsoleDto) {
                    switch (message.type) {
                        case MessageType.INITIALIZE: {
                            await this.webviewAdapter.sendInitialData();
                            break;
                        }
                        case ConsoleMessageType.CREATE_PROJECT: {
                            break;
                        }
                        case ConsoleMessageType.OPEN_PROJECT: {
                            break;
                        }
                    }
                }
            },
        );
    }

    private getHtml(extensionUri: Uri): string {
        if (!this.webview) {
            throw new Error("Webview is not initialized");
        }

        const baseUri = Uri.joinPath(extensionUri, webviewPath);

        const scriptUri = this.webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
        const styleUri = this.webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));

        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />

                <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    style-src ${this.webview.cspSource} https: 'unsafe-inline';
                    img-src ${this.webview.cspSource} data:;
                    font-src ${this.webview.cspSource} https:;
                    script-src 'nonce-${nonce}' 'unsafe-eval';"/>

                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

                <link href="${styleUri}" rel="stylesheet" type="text/css" />

                <title>Miranum IDE</title>
            </head>
            <body>
                <div id="app"></div>
                <script type="text/javascript" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
    }
}

function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
