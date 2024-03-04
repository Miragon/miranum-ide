import { Uri, Webview } from "vscode";
import { getNonce } from "@miranum-ide/vscode/miranum-vscode";

/**
 * The name of the directory where the necessary files for the webview are located after build.
 */
const bpmnModelerWebviewProjectPath = "miranum-modeler-bpmn-webview";
const dmnModelerWebviewProjectPath = "miranum-modeler-dmn-webview";

export function bpmnEditorUi(webview: Webview, extensionUri: Uri): string {
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
                <div class="content with-diagram" id="js-drop-zone">
                    <div class="canvas" id="js-canvas"></div>
                    <div class="properties-panel-parent" id="js-properties-panel"></div>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
        </html>
    `;
}

export function dmnModelerHtml(webview: Webview, extensionUri: Uri): string {
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
