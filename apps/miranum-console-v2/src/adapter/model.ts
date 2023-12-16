import {Uri, ViewColumn, Webview, WebviewPanel, window} from "vscode";
import {singleton} from "tsyringe";
import {EXTENSION_CONTEXT} from "../common";

const webviewPath = "miranum-console-v2-webview"

@singleton()
export class WelcomeWebview {

    private readonly viewType = "miranum-console"

    private panel?: WebviewPanel;

    private _webview?: Webview;

    create() {
        this.panel = window.createWebviewPanel(
            this.viewType,
            "Miranum IDE",
            ViewColumn.One,
            {
                enableScripts: true,
            }
        );

        this._webview = this.panel.webview;
        this._webview.html = getHtml(this._webview, EXTENSION_CONTEXT.getContext().extensionUri);
    }

    close() {
        this.panel?.dispose();
    }

    get webview(): Webview {
        if (!this._webview) {
            throw new Error("Webview is not initialized");
        }
        return this._webview;
    }
}

function getHtml(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, webviewPath);

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

function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
