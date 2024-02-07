import { Uri, Webview, WebviewPanel } from "vscode";
import { getContext, getNonce } from "@miranum-ide/vscode/miranum-vscode";

const bpmnModelerWebviewProjectPath = "miranum-modeler-bpmn-webview";
const dmnModelerWebviewProjectPath = "miranum-modeler-dmn-webview";

let miranumWebviewPanel: WebviewPanel | undefined;

export function setMiranumWebview(webviewPanel: WebviewPanel): Webview {
    miranumWebviewPanel = webviewPanel;
    miranumWebviewPanel.webview.options = { enableScripts: true };
    // TODO: Which modeler should be opened?
    miranumWebviewPanel.webview.html = bpmnModelerHtml(
        miranumWebviewPanel.webview,
        getContext().extensionUri,
    );

    return miranumWebviewPanel.webview;
}

export function getMiranumWebview(): Webview {
    if (!miranumWebviewPanel) {
        throw new Error("No webview panel set.");
    }
    return miranumWebviewPanel.webview;
}

export function disposeWebview() {
    if (miranumWebviewPanel) {
        miranumWebviewPanel.dispose();
        // TODO: Are there any other clean-up tasks?
    }
}

// TODO: Change the type of the message parameter to a more specific type.
export function onDidReceiveMessage(callback: (message: any) => void) {
    miranumWebviewPanel?.webview.onDidReceiveMessage(callback);
}

// TODO: Change the type of the message parameter to a more specific type.
export function onDidChangeViewState(callback: (e: any) => void) {
    miranumWebviewPanel?.onDidChangeViewState(callback);
}

function bpmnModelerHtml(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, bpmnModelerWebviewProjectPath);

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));
    const fontUri = webview.asWebviewUri(Uri.joinPath(baseUri, "css", "bpmn.css"));

    const nonce = getNonce();

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <link href="${fontUri}" rel="stylesheet">
                <title>Miranum: Camunda Modeler</title>
            </head>
            <body>
                <div class="content with-diagram" id="js-properties-panel">
                    <div class="canvas" id="js-canvas"></div>
                    <div class="properties-panel-parent" id="js-properties-panel"></div>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
        </html>
    `;
}

function dmnModelerHtml(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, dmnModelerWebviewProjectPath);

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));
    const frontUri = webview.asWebviewUri(Uri.joinPath(baseUri, "css", "dmn.css"));

    const nonce = getNonce();

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

                <link href="${styleUri}" rel="stylesheet" type="text/css" />
                <link href="${frontUri}" rel="stylesheet" type="text/css" />

                <title>Miranum: DMN Modeler</title>
            </head>
            <body>
              <div class="content with-diagram" id="js-drop-zone">
                <div class="canvas" id="js-canvas"></div>
                <div class="properties-panel-parent" id="js-properties-panel"></div>
              </div>
              <script type="text/javascript" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
}
