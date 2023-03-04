import * as vscode from "vscode";
import { MessageType, VscMessage, WorkspaceFolder } from "./types";
import { Logger, Reader, TextEditor, Watcher } from "./lib";
import debounce from "lodash.debounce";
import { Uri } from "vscode";

export class BpmnModeler implements vscode.CustomTextEditorProvider {

    public static readonly VIEWTYPE = "bpmn-modeler";

    private static counter = 0;

    private write = this.asyncDebounce(this.writeChangesToDocument, 100);

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        Logger.get().clear();
        const provider = new BpmnModeler(context);
        return vscode.window.registerCustomEditorProvider(BpmnModeler.VIEWTYPE, provider);
    }

    private constructor(
        private readonly context: vscode.ExtensionContext,
    ) {
        // Register the command for toggling the standard vscode text editor.
        TextEditor.register(context);
        // ----- Register commands ---->
        const toggleTextEditor = vscode.commands.registerCommand(
            "bpmn-modeler.toggleTextEditor",
            () => {
                TextEditor.toggle();
            });
        const toggleLogger = vscode.commands.registerCommand(
            "bpmn-modeler.toggleLogger",
            () => {
                if (!Logger.isOpen) {
                    Logger.show();
                } else {
                    Logger.hide();
                }
            });
        // <---- Register commands -----

        context.subscriptions.push(toggleTextEditor, toggleLogger);
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

        // Set context for when clause in vscode commands
        BpmnModeler.counter++;
        vscode.commands.executeCommand("setContext", `${BpmnModeler.VIEWTYPE}.openCustomEditor`, BpmnModeler.counter);

        let isUpdateFromWebview = false;
        let isBuffer = false;

        const projectUri = this.getProjectUri(document.uri);
        const workspaceFolder = await this.getWorkspace(projectUri);

        webviewPanel.webview.options = { enableScripts: true };
        TextEditor.document = document;

        const watcher = Watcher.getWatcher(projectUri, workspaceFolder);
        watcher.subscribe(document.uri.path, webviewPanel);
        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            this.context.extensionUri,
        );

        webviewPanel.webview.onDidReceiveMessage(async (event: VscMessage) => {
            try {
                switch (event.type) {
                    case `${BpmnModeler.VIEWTYPE}.${MessageType.initialize}`: {
                        Logger.get().info(`${event.content} (Webview: ${webviewPanel.title})`);
                        postMessage(MessageType.initialize);
                        break;
                    }
                    case `${BpmnModeler.VIEWTYPE}.${MessageType.updateFromWebview}`: {
                        isUpdateFromWebview = true;
                        if (await this.write(document, event.content)) {
                            //MiranumLogger.get().info(`[Miranum.Modeler] Write changes to document ${document.fileName}`);
                        }
                        break;
                    }
                    case `${BpmnModeler.VIEWTYPE}.${MessageType.info}`: {
                        Logger.get().info(`${event.content}\n\t(Webview: ${webviewPanel.title})`);
                        break;
                    }
                    case `${BpmnModeler.VIEWTYPE}.${MessageType.error}`: {
                        Logger.get().error(`${event.content}\n\t(Webview: ${webviewPanel.title})`);
                        break;
                    }
                }
            } catch (error) {
                isUpdateFromWebview = false;
                const message = (error instanceof Error) ? error.message : "Error";
                Logger.get().error(`[Miranum.Modeler] ${message}`);
            }
        });

        const postMessage = async (msgType: MessageType) => {
            if (webviewPanel.visible) {
                let content: string;
                switch (msgType) {
                    case MessageType.initialize: {
                        content = JSON.stringify({
                            bpmn: document.getText(),
                            files: await Reader.get().getAllFiles(projectUri, workspaceFolder),
                        });
                        break;
                    }
                    default: {
                        content = document.getText();
                        break;
                    }
                }

                webviewPanel.webview.postMessage({
                    type: `${BpmnModeler.VIEWTYPE}.${msgType}`,
                    text: content,
                })
                    .then((result) => {
                        if (!result) {
                            Logger.get().error(`[Miranum.Modeler] Message could not be sent to the Webview.`);
                        }
                    }, (reason) => {
                        if (!document.isClosed) {
                            Logger.get().error(`[Miranum.Modeler] ${reason}`);
                        }
                    });
            }
        };

        const saveDocumentSubscription = vscode.workspace.onDidSaveTextDocument((event) => {
            Logger.get().info(`[Miranum.Modeler] Document was saved (${document.fileName})`);
        });

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.toString() === document.uri.toString() &&
                event.contentChanges.length !== 0 && !isUpdateFromWebview) {

                if (!webviewPanel.visible) {
                    // if the webview is not visible we can not send a message
                    isBuffer = true;
                    return;
                }

                switch (event.reason) {
                    case 1: {
                        postMessage(MessageType.undo);
                        break;
                    }
                    case 2: {
                        postMessage(MessageType.redo);
                        break;
                    }
                    case undefined: {
                        postMessage(MessageType.updateFromExtension);
                        break;
                    }
                }
            }
            isUpdateFromWebview = false;
        });

        webviewPanel.onDidChangeViewState((wp) => {
            switch (true) {
                case wp.webviewPanel.active: {
                    TextEditor.document = document;
                    // break omitted
                }
                case wp.webviewPanel.visible: {
                    if (isBuffer) {
                        postMessage(MessageType.updateFromExtension);
                        isBuffer = false;
                    }
                    watcher.update(document.uri.path, wp.webviewPanel);
                    break;
                }
            }
        });

        webviewPanel.onDidDispose(() => {
            BpmnModeler.counter--;
            vscode.commands.executeCommand("setContext", `${BpmnModeler.VIEWTYPE}.openCustomEditor`, BpmnModeler.counter);

            watcher.unsubscribe(document.uri.path);
            changeDocumentSubscription.dispose();
            saveDocumentSubscription.dispose();
        });
    }

    private getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
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

    private asyncDebounce<F extends(...args: any[]) => Promise<boolean>>(func: F, wait?: number) {
        const resolveSet = new Set<(p:boolean)=>void>();
        const rejectSet = new Set<(p:boolean)=>void>();

        const debounced = debounce((bindSelf, args: Parameters<F>) => {
            func.bind(bindSelf)(...args)
                .then((...res) => {
                    resolveSet.forEach((resolve) => resolve(...res));
                    resolveSet.clear();
                })
                .catch((...res) => {
                    rejectSet.forEach((reject) => reject(...res));
                    rejectSet.clear();
                });
        }, wait);

        return (...args: Parameters<F>): ReturnType<F> => new Promise((resolve, reject) => {
            resolveSet.add(resolve);
            rejectSet.add(reject);
            debounced(this, args);
        }) as ReturnType<F>;
    }

    private async writeChangesToDocument(document: vscode.TextDocument, text: string): Promise<boolean> {
        if (document.getText() === text) {
            return Promise.reject("[Miranum.Modeler] No changes to apply!");
        }

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
    private getProjectUri(document: Uri): Uri {
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
        return Uri.parse(documentParts.join("/"));
    }

    private async getWorkspace(projectUri: Uri): Promise<WorkspaceFolder[]> {
        async function getMiranumJson() {
            // eslint-disable-next-line no-useless-catch
            try {
                const file = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(projectUri, "miranum.json"));
                const workspace: WorkspaceFolder[] = JSON.parse(Buffer.from(file).toString("utf-8")).workspace;
                return workspace;
            } catch (error) {
                throw error;
            }
        }

        function getDefaultWorkspace(): WorkspaceFolder[] {
            return [{
                type: "element-template",
                path: "element-templates",
                extension: ".json",
            }];
        }

        try {
            return await getMiranumJson();
        } catch (error) {
            let message = "Could not read miranum.json";
            message = (error instanceof Error) ? `${message}: ${error.message}` : message;
            Logger.get().error(`[Miranum.Modeler] ${message}`);
            return getDefaultWorkspace();
        }
    }
}
