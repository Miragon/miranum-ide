import * as vscode from "vscode";
import { FolderContent, WorkspaceFolder } from "./types";
import { FileSystemReader, TextEditor, Watcher } from "./lib";

export class BpmnModeler implements vscode.CustomTextEditorProvider {

    public static readonly viewType = "bpmn-modeler";

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new BpmnModeler(context);
        return vscode.window.registerCustomEditorProvider(BpmnModeler.viewType, provider);
    }

    private constructor(
        private readonly context: vscode.ExtensionContext,
    ) {
        // Register the command for toggling the standard vscode text editor.
        TextEditor.register(context);
        context.subscriptions.push(vscode.commands.registerCommand("bpmn-modeler.toggleTextEditor", () => {
            TextEditor.toggle();
        }));
    }

    /**
     * Called when the custom editor / source file is opened
     * @param document Represents the source file
     * @param webviewPanel Panel that contains the webview
     * @param token Token to cancel asynchronous or long-running operations
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken,
    ): Promise<void> {

        // Disable preview mode
        await vscode.commands.executeCommand("workbench.action.keepEditor");

        let isUpdateFromWebview = false;
        let isUpdateFromExtension = false;
        let isBuffer = false;

        const projectUri = this.getProjectUri(document.uri);

        let workspaceFolder: WorkspaceFolder[];
        try {
            workspaceFolder = await getWorkspace();
        } catch (error) {
            workspaceFolder = this.getDefaultWorkspace();
            console.log("miragon-gmbh.vs-code-bpmn-modeler -> " + error);
        }

        webviewPanel.webview.options = { enableScripts: true };
        TextEditor.document = document;

        const reader = FileSystemReader.getFileSystemReader();
        const watcher = Watcher.getWatcher(projectUri, workspaceFolder);
        watcher.subscribe(document.uri.path, webviewPanel);
        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            this.context.extensionUri,
            document.getText(),
            await reader.getAllFiles(projectUri, workspaceFolder),
        );

        async function getWorkspace() {
            try {
                const file = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(projectUri, "miranum.json"));
                const workspace: WorkspaceFolder[] = JSON.parse(Buffer.from(file).toString("utf-8")).workspace;
                return workspace;
            } catch (error) {
                throw new Error("[MiranumModeler] getWorkspace() -> " + error);
            }
        }

        webviewPanel.webview.onDidReceiveMessage((event) => {
            switch (event.type) {
                case BpmnModeler.viewType + ".updateFromWebview":
                    console.log("receivedMsg outer", event.content);
                    if (!isUpdateFromExtension) {
                        isUpdateFromWebview = true;
                        console.log("receivedMsg inner", event.content);
                        this.updateTextDocument(document, event.content);
                    }
                    isUpdateFromExtension = false;
                    break;
            }
        });

        const updateWebview = (msgType: string) => {
            if (webviewPanel.visible) {
                webviewPanel.webview.postMessage({
                    type: msgType,
                    text: document.getText(),
                })
                    .then((result) => {
                        if (result) {
                            // ...
                        }
                    }, (reason) => {
                        if (!document.isClosed) {
                            console.error("BPMN Modeler:", reason);
                        }
                    });
            }
        };

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.toString() === document.uri.toString() && event.contentChanges.length !== 0) {
                if (!webviewPanel.visible) {
                    isBuffer = true;
                    return;
                }

                switch (event.reason) {
                    case 1: {
                        isUpdateFromExtension = true;
                        updateWebview(BpmnModeler.viewType + ".undo");
                        break;
                    }
                    case 2: {
                        isUpdateFromExtension = true;
                        updateWebview(BpmnModeler.viewType + ".redo");
                        break;
                    }
                    case undefined: {
                        if (!isUpdateFromWebview) {
                            isUpdateFromExtension = true;
                            updateWebview(BpmnModeler.viewType + ".updateFromExtension");
                        }
                        isUpdateFromWebview = false;
                        break;
                    }
                }
            }
        });

        webviewPanel.onDidChangeViewState((wp) => {
            switch (true) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                case wp.webviewPanel.active: {
                    TextEditor.document = document;
                    /* falls through */
                }
                case wp.webviewPanel.visible: {
                    if (isBuffer) {
                        updateWebview(BpmnModeler.viewType + ".updateFromExtension");
                        isBuffer = false;
                    }
                    watcher.update(document.uri.path, wp.webviewPanel);
                    break;
                }
            }
        });

        webviewPanel.onDidDispose(() => {
            watcher.unsubscribe(document.uri.path);
            changeDocumentSubscription.dispose();
        });
    }

    private getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, initialContent: string, files: FolderContent[]) {
        const pathToWebview = vscode.Uri.joinPath(extensionUri, "miranum-modeler-webview");

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(pathToWebview, "index.js"));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(pathToWebview, "index.css"));
        const fontBpmn = webview.asWebviewUri(vscode.Uri.joinPath(pathToWebview, "css", "bpmn.css"));

        const nonce = this.getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />

                <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    style-src ${webview.cspSource} 'unsafe-inline';
                    img-src ${webview.cspSource} data:;
                    font-src ${webview.cspSource};
                    script-src 'nonce-${nonce}';"/>

                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

                <link href="${styleUri}" rel="stylesheet" type="text/css" />
                <link href="${fontBpmn}" rel="stylesheet" type="text/css" />

                <title>Custom Texteditor Template</title>
            </head>
            <body>
              <div class="content with-diagram" id="js-drop-zone">

                <div class="message error">
                  <div class="note">
                    <p>Ooops, we could not display the BPMN 2.0 diagram.</p>

                    <div class="details">
                      <span>Import Error Details</span>
                      <pre></pre>
                    </div>
                  </div>
                </div>

                <div class="canvas" id="js-canvas"></div>
                <div class="properties-panel-parent" id="js-properties-panel"></div>
              </div>

              <script type="text/javascript" nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                const state = vscode.getState();
                if (!state) {
                    vscode.setState({
                      text: '${JSON.stringify(initialContent)}',
                      files: '${JSON.stringify(files)}'
                    });
                }
              </script>
              <script type="text/javascript" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
    }

    private getNonce(): string {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private updateTextDocument(document: vscode.TextDocument, text: string): Thenable<boolean> {
        const edit = new vscode.WorkspaceEdit();

        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            text,
        );

        return vscode.workspace.applyEdit(edit);
    }

    /**
     * Gets the URI of the currently opened project.
     * If a workspace exists, the URI of the workspace is returned, otherwise the URI of the open document without the filename.
     * @param document The URI of the open document
     * @private
     */
    private getProjectUri(document: vscode.Uri): vscode.Uri {
        const workspaces = vscode.workspace.workspaceFolders;
        let documentParts = document.path.split("/");
        documentParts = documentParts.slice(0, documentParts.length - 1);
        if (workspaces) {
            for (const ws of workspaces) {
                const wsParts = ws.uri.path.split("/");
                const documentPath = documentParts.slice(0, wsParts.length).join("/");
                if (ws.uri.path === documentPath) {
                    return ws.uri;
                }
            }
        }
        return vscode.Uri.parse(documentParts.join("/"));
    }

    private getDefaultWorkspace(): WorkspaceFolder[] {
        return [{
            type: "element-template",
            path: "element-templates",
            extension: ".json",
        }];
    }
}
