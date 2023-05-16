import * as vscode from "vscode";
import { Uri, window } from "vscode";
import { Logger, Reader, WorkspaceFolder } from "@miranum-ide/vscode/miranum-vscode";
import { MessageType, VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";
import { TextEditor, Watcher } from "./lib";
import { debounce } from "lodash";
import { ModelerData } from "@miranum-ide/vscode/shared/miranum-modeler";

export class DmnModeler implements vscode.CustomTextEditorProvider {
    public static readonly VIEWTYPE = "dmn-modeler";

    private static counter = 0;

    private write = this.asyncDebounce(this.writeChangesToDocument, 100);

    private constructor(private readonly context: vscode.ExtensionContext) {
        // Register the command for toggling the standard vscode text editor.
        TextEditor.register(context);
        // ----- Register commands ---->
        const toggleTextEditor = vscode.commands.registerCommand(
            "dmn-modeler.toggleTextEditor",
            () => {
                TextEditor.toggle();
            },
        );
        const toggleLogger = vscode.commands.registerCommand(
            "dmn-modeler.toggleLogger",
            () => {
                if (!Logger.isOpen) {
                    Logger.show();
                } else {
                    Logger.hide();
                }
            },
        );
        // <---- Register commands -----

        context.subscriptions.push(toggleTextEditor, toggleLogger);
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        Logger.get().clear();
        const provider = new DmnModeler(context);
        return vscode.window.registerCustomEditorProvider(DmnModeler.VIEWTYPE, provider);
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
        DmnModeler.counter++;
        vscode.commands.executeCommand(
            "setContext",
            `${DmnModeler.VIEWTYPE}.openCustomEditor`,
            DmnModeler.counter,
        );

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

        webviewPanel.webview.onDidReceiveMessage(
            async (event: VscMessage<ModelerData>) => {
                try {
                    switch (event.type) {
                        case `${DmnModeler.VIEWTYPE}.${MessageType.INITIALIZE}`: {
                            Logger.info(
                                "[Miranum.DmnModeler.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            await postMessage(MessageType.INITIALIZE);
                            break;
                        }
                        case `${DmnModeler.VIEWTYPE}.${MessageType.RESTORE}`: {
                            Logger.info(
                                "[Miranum.DmnModeler.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            await postMessage(MessageType.RESTORE);
                            break;
                        }
                        case `${DmnModeler.VIEWTYPE}.${MessageType.UPDATEFROMWEBVIEW}`: {
                            isUpdateFromWebview = true;
                            if (event.data?.dmn) {
                                await this.write(document, event.data.dmn);
                            }
                            break;
                        }
                        case `${DmnModeler.VIEWTYPE}.${MessageType.INFO}`: {
                            Logger.info(
                                "[Miranum.DmnModeler.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            break;
                        }
                        case `${DmnModeler.VIEWTYPE}.${MessageType.ERROR}`: {
                            Logger.error(
                                "[Miranum.DmnModeler.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            break;
                        }
                    }
                } catch (error) {
                    isUpdateFromWebview = false;
                    const message = error instanceof Error ? error.message : `${error}`;
                    Logger.error(
                        "[Miranum.DmnModeler]",
                        `(Webview: ${webviewPanel.title})`,
                        message,
                    );
                }
            },
        );

        const postMessage = async (msgType: MessageType) => {
            if (webviewPanel.visible) {
                let data: ModelerData | undefined;
                switch (msgType) {
                    case MessageType.INITIALIZE: {
                        data = {
                            dmn: document.getText(),
                            additionalFiles: await Reader.get().getAllFiles(
                                projectUri,
                                workspaceFolder,
                            ),
                        };
                        break;
                    }
                    case MessageType.RESTORE: {
                        data = {
                            dmn: isBuffer ? document.getText() : undefined,
                            additionalFiles: watcher.isUnresponsive(document.uri.path)
                                ? await watcher.getChangedData()
                                : undefined,
                        };
                        break;
                    }
                    default: {
                        data = {
                            dmn: document.getText(),
                        };
                        break;
                    }
                }

                try {
                    if (
                        await webviewPanel.webview.postMessage({
                            type: `${DmnModeler.VIEWTYPE}.${msgType}`,
                            data,
                        })
                    ) {
                        if (msgType === MessageType.RESTORE) {
                            watcher.removeUnresponsive(document.uri.path);
                            isBuffer = false;
                        }
                    } else {
                        if (msgType === MessageType.RESTORE) {
                            window
                                .showInformationMessage(
                                    `Failed to reload modeler! Webview: ${webviewPanel.title}`,
                                    ...["Try again"],
                                )
                                .then((input) => {
                                    if (input === "Try again") {
                                        postMessage(MessageType.RESTORE);
                                    }
                                });
                        }
                        Logger.error(
                            "[Miranum.DmnModeler]",
                            `(Webview: ${webviewPanel.title})`,
                            `Could not post message (Viewtype: ${webviewPanel.visible})`,
                        );
                    }
                } catch (error) {
                    if (!document.isClosed) {
                        window.showInformationMessage(
                            `Failed to reload modeler! Webview: ${webviewPanel.title}`,
                        );
                        const message =
                            error instanceof Error
                                ? error.message
                                : `Could not post message to ${webviewPanel}`;
                        Logger.error(
                            "[Miranum.DmnModeler]",
                            `(Webview: ${webviewPanel.title})`,
                            message,
                        );
                    }
                }
            }
        };

        const saveDocumentSubscription = vscode.workspace.onDidSaveTextDocument(() => {
            Logger.info(
                "[Miranum.DmnModeler]",
                `(Webview: ${webviewPanel.title})`,
                `Document was saved (${document.fileName})`,
            );
        });

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
            (event) => {
                if (
                    event.document.uri.toString() === document.uri.toString() &&
                    event.contentChanges.length !== 0 &&
                    !isUpdateFromWebview
                ) {
                    if (!webviewPanel.visible) {
                        // if the webview is not visible we can not send a message
                        isBuffer = true;
                        return;
                    }

                    switch (event.reason) {
                        case 1: {
                            postMessage(MessageType.UNDO);
                            break;
                        }
                        case 2: {
                            postMessage(MessageType.REDO);
                            break;
                        }
                        case undefined: {
                            postMessage(MessageType.UPDATEFROMEXTENSION);
                            break;
                        }
                    }
                }
                isUpdateFromWebview = false;
            },
        );

        webviewPanel.onDidChangeViewState((wp) => {
            switch (true) {
                case wp.webviewPanel.active: {
                    TextEditor.document = document;
                    // break omitted
                }
                case wp.webviewPanel.visible: {
                    break;
                }
            }
        });

        webviewPanel.onDidDispose(() => {
            DmnModeler.counter--;
            vscode.commands.executeCommand(
                "setContext",
                `${DmnModeler.VIEWTYPE}.openCustomEditor`,
                DmnModeler.counter,
            );

            watcher.unsubscribe(document.uri.path);
            changeDocumentSubscription.dispose();
            saveDocumentSubscription.dispose();
        });
    }

    private getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const pathToWebview = vscode.Uri.joinPath(
            extensionUri,
            "miranum-dmn-modeler-webview",
        );

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(pathToWebview, "index.js"),
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(pathToWebview, "index.css"),
        );
        const frontDmn = webview.asWebviewUri(
            vscode.Uri.joinPath(pathToWebview, "css", "dmn.css"),
        );

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
                <link href="${frontDmn}" rel="stylesheet" type="text/css" />

                <title>Custom Texteditor Template</title>
            </head>
            <body>
              <div class="content with-diagram" id="js-drop-zone">

                <div class="message error">
                  <div class="note">
                    <p>Ooops, we could not display the DMN diagram.</p>

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
        const possible =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private asyncDebounce<F extends (...args: any[]) => Promise<boolean>>(
        func: F,
        wait?: number,
    ) {
        const resolveSet = new Set<(p: boolean) => void>();
        const rejectSet = new Set<(p: boolean) => void>();

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

        return (...args: Parameters<F>): ReturnType<F> =>
            new Promise((resolve, reject) => {
                resolveSet.add(resolve);
                rejectSet.add(reject);
                debounced(this, args);
            }) as ReturnType<F>;
    }

    private async writeChangesToDocument(
        document: vscode.TextDocument,
        text: string,
    ): Promise<boolean> {
        if (document.getText() === text) {
            return Promise.reject("No changes to apply!");
        }

        const edit = new vscode.WorkspaceEdit();

        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text);

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
                const file = await vscode.workspace.fs.readFile(
                    vscode.Uri.joinPath(projectUri, "miranum.json"),
                );
                const workspace: WorkspaceFolder[] = JSON.parse(
                    Buffer.from(file).toString("utf-8"),
                ).workspace;
                return workspace;
            } catch (error) {
                throw error;
            }
        }

        function getDefaultWorkspace(): WorkspaceFolder[] {
            return [
                {
                    type: "element-template",
                    path: "element-templates",
                    extension: ".json",
                },
            ];
        }

        try {
            return await getMiranumJson();
        } catch (error) {
            const message = error instanceof Error ? error.message : `${error}`;
            Logger.error(
                "[Miranum.DmnModeler]",
                "Could not read miranum.json:",
                `\n${message}`,
            );
            return getDefaultWorkspace();
        }
    }
}
