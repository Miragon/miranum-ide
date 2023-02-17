import * as vscode from "vscode";

export function getWebviewHTML(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const pathToWebview = vscode.Uri.joinPath(extensionUri, "miranum-console-webview");
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(pathToWebview, "index.js"));

    // TODO enable csp
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Miranum Console</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="text/javascript" src="${scriptUri}"></script>
    </body>
    </html>`;
}

export function getNonce(length = 32): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
