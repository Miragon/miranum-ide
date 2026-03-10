import { Uri, Webview } from "vscode";
import { getNonce } from "./helpers";

/** Output directory name for the deployment webview build artefacts. */
const DEPLOYMENT_WEBVIEW_PATH = "modeler-plugin-deployment-webview";

/**
 * Generates the HTML shell for the deployment sidebar WebviewView.
 *
 * Resolves asset URIs relative to the extension's install directory and
 * injects a nonce for the Content-Security-Policy `script-src` directive so
 * that only the bundled script can execute.
 *
 * @param webview The VS Code Webview instance (used to convert local URIs).
 * @param extensionUri URI of the extension's install directory.
 * @returns HTML string to set as `webviewView.webview.html`.
 */
export function deploymentWebviewHtml(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, DEPLOYMENT_WEBVIEW_PATH);

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));

    const nonce = getNonce();

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <meta http-equiv="Content-Security-Policy"
                      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"/>
                <link href="${styleUri}" rel="stylesheet"/>
                <title>Deploy Diagram</title>
            </head>
            <body>
                <div id="app">
                    <h2>Deploy Diagram</h2>

                    <div class="form-group">
                        <label for="deployment-name">Deployment Name</label>
                        <input id="deployment-name" type="text" placeholder="e.g. my-process" />
                    </div>

                    <div class="form-group">
                        <label for="tenant-id">Tenant ID</label>
                        <input id="tenant-id" type="text" placeholder="(optional)" />
                    </div>

                    <div class="form-group">
                        <label for="endpoint">REST Endpoint</label>
                        <input id="endpoint" type="text" placeholder="http://localhost:8080/engine-rest" />
                        <div class="hint">Should point to a running Camunda REST API.</div>
                    </div>

                    <div class="form-group">
                        <label for="engine">Engine</label>
                        <select id="engine">
                            <option value="c7">Camunda Platform 7</option>
                            <option value="c8">Camunda Cloud 8</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="main-file-path">Main File</label>
                        <input id="main-file-path" type="text" readonly />
                    </div>

                    <div class="form-group">
                        <div class="additional-files-header">
                            <label>Include additional files</label>
                            <button id="add-files-btn" title="Select additional files">+</button>
                        </div>
                        <ul id="file-list"></ul>
                    </div>

                    <div id="status-banner" class="status-banner"></div>

                    <button id="deploy-btn">Deploy</button>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
        </html>
    `;
}
