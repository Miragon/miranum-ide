import { Uri, Webview } from "vscode";
import { getNonce } from "@miranum-ide/vscode/miranum-vscode";

/**
 * The name of the directory where the necessary files for the webview are located after build.
 */
const formBuilderProjectPath = "miranum-jsonforms-builder-webview";
const formPreviewProjectPath = "miranum-jsonforms-preview-webview";

export function formEditorUi(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, formBuilderProjectPath);

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));

    const nonce = getNonce();

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>Miranum: JSON Forms Builder</title>
            </head>
            <body>
                <div id="app"></div>
                <script type="module" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
        </html>
    `;
}

export function formPreviewUi(webview: Webview, extensionUri: Uri): string {
    const baseUri = Uri.joinPath(extensionUri, formPreviewProjectPath);

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const styleUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.css"));

    const nonce = getNonce();

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>Miranum: JSON Forms Preview</title>
            </head>
            <body>
                <div id="app"></div>
                <script type="module" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
        </html>
    `;
}
