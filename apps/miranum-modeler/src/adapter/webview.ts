import { Uri, Webview, WebviewPanel } from "vscode";
import { getContext, getNonce } from "@miranum-ide/vscode/miranum-vscode";

/**
 * The name of the directory where the necessary files for the webview are located after build.
 */
const bpmnModelerWebviewProjectPath = "miranum-modeler-bpmn-webview";
const dmnModelerWebviewProjectPath = "miranum-modeler-dmn-webview";

let miranumWebviewPanel: WebviewPanel | undefined;

export function setMiranumWebview(
    webviewPanel: WebviewPanel,
    fileExtension: string,
): Webview {
    miranumWebviewPanel = webviewPanel;

    const webview = miranumWebviewPanel.webview;
    webview.options = { enableScripts: true };

    if (fileExtension === "bpmn") {
        webview.html = bpmnModelerHtml(
            miranumWebviewPanel.webview,
            getContext().extensionUri,
        );
    } else if (fileExtension === "dmn") {
        webview.html = dmnModelerHtml(
            miranumWebviewPanel.webview,
            getContext().extensionUri,
        );
    } else {
        throw new Error(`Unsupported file extension: ${fileExtension}`);
    }

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
                <title>Miranum: BPMN Modeler</title>
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
