import { Disposable, Uri, Webview, WebviewPanel } from "vscode";

import { getContext, getNonce } from "@miranum-ide/vscode/miranum-vscode";
import {
    MiranumModelerCommand,
    MiranumModelerQuery,
} from "@miranum-ide/vscode/miranum-vscode-webview";

let activeWebviewPanel: { id: string; panel: WebviewPanel } | undefined;

const disposables: Map<string, Disposable[]> = new Map();

/**
 * The name of the directory where the necessary files for the webview are located after build.
 */
const bpmnModelerWebviewProjectPath = "miranum-modeler-bpmn-webview";
const dmnModelerWebviewProjectPath = "miranum-modeler-dmn-webview";

export function createMiranumWebview(
    id: string,
    webviewPanel: WebviewPanel,
    viewType: string,
): WebviewPanel {
    activeWebviewPanel = {
        id,
        panel: webviewPanel,
    };

    const webview = activeWebviewPanel.panel.webview;
    webview.options = { enableScripts: true };

    if (viewType === "miranum-bpmn-modeler") {
        webview.html = bpmnModelerHtml(webview, getContext().extensionUri);
    } else if (viewType === "miranum-dmn-modeler") {
        webview.html = dmnModelerHtml(webview, getContext().extensionUri);
    } else {
        throw new Error(`Unsupported file extension: ${viewType}`);
    }

    activeWebviewPanel.panel.onDidDispose(() => disposeWebview());

    return activeWebviewPanel.panel;
}

export function setMiranumWebviewPanel(id: string, webviewPanel: WebviewPanel) {
    activeWebviewPanel = {
        id,
        panel: webviewPanel,
    };
}

export async function postMessage(
    webviewId: string,
    message: MiranumModelerCommand | MiranumModelerQuery,
): Promise<boolean> {
    if (activeWebviewPanel?.id !== webviewId) {
        throw new Error("Webview id does not match the active webview id.");
    }
    return getMiranumWebview().postMessage(message);
}

export function subscribeToWebviewDispose(webviewId: string, disposable: Disposable) {
    const subscriptions = disposables.get(webviewId);

    if (subscriptions) {
        subscriptions.push(disposable);
    } else {
        disposables.set(webviewId, [disposable]);
    }
}

export function onDidReceiveMessage(callback: (message: MiranumModelerCommand) => void) {
    getMiranumWebview().onDidReceiveMessage(callback);
}

function getMiranumWebview(): Webview {
    if (!activeWebviewPanel) {
        throw new Error("No webview panel set.");
    }
    return activeWebviewPanel.panel.webview;
}

function disposeWebview() {
    if (activeWebviewPanel) {
        activeWebviewPanel.panel.dispose();

        const subscriptions = disposables.get(activeWebviewPanel.id);
        if (subscriptions) {
            subscriptions.forEach((subscription) => subscription.dispose());
        }
        disposables.delete(activeWebviewPanel.id);
    }
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
