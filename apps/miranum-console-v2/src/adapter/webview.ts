import { Uri, ViewColumn, Webview, WebviewPanel, window } from "vscode";
import { container, inject, singleton } from "tsyringe";
import {
    CreateNewWorkspaceCommand,
    ImagePathQuery,
    LogErrorCommand,
    LogInfoCommand,
    LogMessageCommand,
    MiranumConsoleCommand,
    MiranumConsoleQuery,
    OpenWorkspaceCommand,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import { EXTENSION_CONTEXT } from "../common";
import { WebviewAdapter } from "./in/vscode";

@singleton()
export class WelcomeView {
    private readonly viewType = "miranum-console";

    private panel?: WebviewPanel;

    private readonly webviewPath;

    constructor(@inject("WebviewPath") webviewPath: string) {
        this.webviewPath = webviewPath;
    }

    private get webview(): Webview {
        if (!this.panel?.webview) {
            throw new Error("Webview is not initialized");
        }
        return this.panel.webview;
    }

    create() {
        const extensionUri = EXTENSION_CONTEXT.getContext().extensionUri;
        this.panel = window.createWebviewPanel(
            this.viewType,
            "Miranum IDE",
            ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [Uri.joinPath(extensionUri, this.webviewPath)],
            },
        );

        this.onDidReceiveMessage(); // have to be called before setting the html otherwise we may miss the first message
        // this.panel.webview.options = {};
        this.panel.webview.html = this.getHtml(extensionUri);

        return true;
    }

    dispose() {
        this.panel?.dispose();
        return true;
    }

    async postMessage(message: MiranumConsoleQuery | ImagePathQuery) {
        return (await this.webview.postMessage(message)) ?? false;
    }

    getLinkAsWebviewUri(paths: Map<string, string>): Map<string, string> {
        const extensionUri = EXTENSION_CONTEXT.getContext().extensionUri;
        const linksAsWebviewUri = new Map<string, string>();

        for (const [key, value] of paths) {
            linksAsWebviewUri.set(
                key,
                this.webview.asWebviewUri(Uri.joinPath(extensionUri, value)).toString(),
            );
        }

        return linksAsWebviewUri;
    }

    private onDidReceiveMessage() {
        const webview = this.panel?.webview;
        if (!webview) {
            throw new Error("Webview is not initialized");
        }

        const webviewAdapter = container.resolve(WebviewAdapter);

        webview.onDidReceiveMessage(
            async (
                message: MiranumConsoleCommand | MiranumConsoleQuery | LogMessageCommand,
            ) => {
                switch (true) {
                    case message.type === "GetLatestWorkspaceCommand": {
                        await webviewAdapter.sendLatestWorkspaces();
                        break;
                    }
                    case message.type === "GetImagePathCommand": {
                        await webviewAdapter.sendImagePaths();
                        break;
                    }
                    case message.type === "GetPathForNewWorkspaceCommand": {
                        await webviewAdapter.sendPathForNewWorkspace();
                        break;
                    }
                    case message.type === "OpenWorkspaceCommand": {
                        // case: the workspace was chosen from the latest workspaces list
                        await webviewAdapter.openWorkspace(
                            message as OpenWorkspaceCommand,
                        );
                        break;
                    }
                    case message.type === "OpenWorkspaceDialogCommand": {
                        // case: the user opens a dialog were he can choose the workspace
                        await webviewAdapter.openWorkspace();
                        break;
                    }
                    case message.type === "CreateNewWorkspaceCommand": {
                        await webviewAdapter.createWorkspace(
                            message as CreateNewWorkspaceCommand,
                        );
                        break;
                    }
                    case message.type === "LogInfoCommand": {
                        console.log((message as LogInfoCommand).message);
                        break;
                    }
                    case message.type === "LogErrorCommand": {
                        console.log((message as LogErrorCommand).message);
                        break;
                    }
                }
            },
        );
    }

    private getHtml(extensionUri: Uri): string {
        const webview = this.panel?.webview;
        if (!webview) {
            throw new Error("Webview is not initialized");
        }

        const baseUri = Uri.joinPath(extensionUri, this.webviewPath);

        const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
        const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));
        const codiconUri = webview.asWebviewUri(
            Uri.joinPath(baseUri, "codicons", "codicon.css"),
        );

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

                <link href="${styleUri}" rel="stylesheet" type="text/css" />
                <link href="${codiconUri}" rel="stylesheet" type="text/css" />

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
