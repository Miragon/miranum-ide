import { Uri, Webview } from "vscode";

import { getNonce } from "@miranum-ide/miranum-vscode";

import { VsCodeSettings } from "./VsCodeSettings";

/** Output directory name for the BPMN webview build artefacts. */
const BPMN_WEBVIEW_PATH = "miranum-modeler-bpmn-webview";
/** Output directory name for the DMN webview build artefacts. */
const DMN_WEBVIEW_PATH = "miranum-modeler-dmn-webview";

/**
 * Generates the HTML content for the BPMN modeler webview.
 *
 * Resolves all asset URIs relative to the extension's install directory and
 * injects them into the HTML template.  The dark/light theme stylesheet is
 * selected from the current VS Code settings.
 *
 * @param webview The VS Code Webview instance (used to convert local URIs).
 * @param extensionUri URI of the extension's install directory.
 * @returns HTML string to set as `webview.html`.
 */
export function bpmnEditorUi(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, BPMN_WEBVIEW_PATH);

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));
    const fontUri = webview.asWebviewUri(Uri.joinPath(baseUri, "css", "bpmn.css"));
    const themeUri = new VsCodeSettings().getDarkTheme()
        ? webview.asWebviewUri(Uri.joinPath(baseUri, "darkTheme.css"))
        : webview.asWebviewUri(Uri.joinPath(baseUri, "lightTheme.css"));

    const nonce = getNonce();

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <link href="${styleUri}" rel="stylesheet"/>
                <link href="${themeUri}" rel="stylesheet" id="theme-link"/>
                <link href="${fontUri}" rel="stylesheet"/>
                <title>Miranum: BPMN Modeler</title>
            </head>
            <body>
                <div class="content with-diagram" id="js-drop-zone">
                    <div class="canvas" id="js-canvas"></div>
                    <div id="js-panel-resizer" class="panel-resizer"></div>
                    <div class="properties-panel-parent" id="js-properties-panel"></div>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
        </html>
    `;
}

/**
 * Generates the HTML content for the DMN modeler webview.
 *
 * @param webview The VS Code Webview instance.
 * @param extensionUri URI of the extension's install directory.
 * @returns HTML string to set as `webview.html`.
 */
export function dmnModelerHtml(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, DMN_WEBVIEW_PATH);

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const styleResetUri = webview.asWebviewUri(
        Uri.joinPath(extensionUri, "assets", "reset.css"),
    );
    const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));
    const frontUri = webview.asWebviewUri(Uri.joinPath(baseUri, "css", "dmn.css"));

    const nonce = getNonce();

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

                <link href="${styleResetUri}" rel="stylesheet">
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
