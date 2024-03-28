/**
 * This module includes helper-functions wich are use by the JSON Schema Builder and Preview.
 * @module Functions
 */

import * as vscode from "vscode";
import { Uri } from "vscode";
import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-jsonforms";

/**
 * Get minimum form.
 */
export function getMinimum<T extends FormBuilderData>(): T {
    return JSON.parse(
        JSON.stringify({
            schema: {
                type: "object",
                properties: {},
            },
            uischema: {
                type: "VerticalLayout",
                elements: [],
            },
            data: {},
        }),
    );
}

/**
 * Get the HTML-Document which display the webview
 * @param webview Webview belonging to the panel
 * @param extensionUri
 * @param viewType
 * @returns a string which represents the html content
 */
export function getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    viewType: string,
): string {
    const baseUri = Uri.joinPath(extensionUri, "miranum-jsonforms-webview");

    const scriptUri = webview.asWebviewUri(Uri.joinPath(baseUri, "index.js"));
    const resetUri = webview.asWebviewUri(Uri.joinPath(baseUri, "reset.css"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(baseUri, "index.css"));

    const nonce = getNonce();

    // todo
    //  unsafe-eval in script-src?

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />

                <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    style-src ${webview.cspSource} 'unsafe-inline';
                    font-src ${webview.cspSource};
                    img-src ${webview.cspSource} data:;
                    connect-src ${webview.cspSource} https://api.iconify.design/mdi.json;
                    script-src 'nonce-${nonce}' 'unsafe-eval';">

                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${resetUri}" rel="stylesheet" type="text/css" />
                <link href="${styleUri}" rel="stylesheet" type="text/css" />

                <title>Json Schema Builder</title>
            </head>
            <body>
                <div id="app"></div>
                <script type="text/javascript" nonce="${nonce}">
                    const globalViewType = '${viewType}';
                </script>
                <script type="text/javascript" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
}

export function getNonce(length = 32): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
