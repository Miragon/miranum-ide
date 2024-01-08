import {
    CancellationToken,
    commands,
    CustomTextEditorProvider,
    Disposable,
    ExtensionContext,
    Range,
    TextDocument,
    Uri,
    Webview,
    WebviewPanel,
    window,
    workspace,
    WorkspaceEdit,
} from "vscode";
import { debounce } from "lodash";
import { Buffer } from "node:buffer";

import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";
import { Logger, Reader } from "@miranum-ide/vscode/miranum-vscode";
import { MessageType, VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";
import {
    ExecutionPlatformVersion,
    ModelerData,
} from "@miranum-ide/vscode/shared/miranum-modeler";

import { getAlignToOrigin, StandardTextEditor, Watcher } from "./lib";

export class BpmnModeler implements CustomTextEditorProvider {
    public static readonly VIEWTYPE = "bpmn-modeler";

    private static counter = 0;

    private write = this.asyncDebounce(this.writeChangesToDocument, 100);

    private constructor(private readonly context: ExtensionContext) {
        // Register the command for toggling the standard vscode text editor.
        StandardTextEditor.register(context);

        // ----- Register commands ---->
        const toggleTextEditor = commands.registerCommand(
            "bpmn-modeler.toggleTextEditor",
            () => {
                StandardTextEditor.toggle();
            },
        );
        const toggleLogger = commands.registerCommand(
            "bpmn-modeler.toggleLogger",
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

    public static register(context: ExtensionContext): Disposable {
        Logger.get().clear();
        const provider = new BpmnModeler(context);
        return window.registerCustomEditorProvider(BpmnModeler.VIEWTYPE, provider);
    }

    /**
     * Called when the custom editor / source file is opened.
     * @param document Represents the source file.
     * @param webviewPanel Panel that contains the webview.
     * @param token Token to cancel asynchronous or long-running operations.
     */
    public async resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): Promise<void> {
        // Disable preview mode
        await commands.executeCommand("workbench.action.keepEditor");

        // Set context for when clause in vscode commands
        BpmnModeler.counter++;
        commands.executeCommand(
            "setContext",
            `${BpmnModeler.VIEWTYPE}.openCustomEditor`,
            BpmnModeler.counter,
        );

        // Helper
        let isUpdateFromWebview = false;
        let isBuffer = false;

        // Important paths and content of miranum.json
        const pathToProjectRoot = this.getPathToProjectRoot(document.uri);
        const { pathToMiranumJson, miranumWorkspaceItems } = await this.getMiranumJson(
            pathToProjectRoot,
            Uri.parse(document.uri.toString().split("/").slice(0, -1).join("/")),
        );

        // Initialize TextEditor and Watcher
        StandardTextEditor.document = document;
        const watcher = Watcher.getWatcher(
            pathToMiranumJson ? pathToMiranumJson : pathToProjectRoot,
            miranumWorkspaceItems,
        );
        watcher.subscribe(document.uri.path, webviewPanel);

        // Initialize Webview
        const artifacts = Reader.get().getAllFiles(
            pathToMiranumJson ? pathToMiranumJson : pathToProjectRoot,
            miranumWorkspaceItems,
        );

        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            this.context.extensionUri,
        );

        // --- Create EventListener for the webview --->
        // (1) EventListener on receiving messages
        webviewPanel.webview.onDidReceiveMessage(
            async (event: VscMessage<ModelerData>) => {
                try {
                    switch (event.type) {
                        case `${BpmnModeler.VIEWTYPE}.${MessageType.INITIALIZE}`: {
                            Logger.info(
                                "[Miranum.Modeler.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            await postMessage(MessageType.INITIALIZE);
                            break;
                        }
                        case `${BpmnModeler.VIEWTYPE}.${MessageType.RESTORE}`: {
                            Logger.info(
                                "[Miranum.Modeler.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            await postMessage(MessageType.RESTORE);
                            break;
                        }
                        case `${BpmnModeler.VIEWTYPE}.${MessageType.MSGFROMWEBVIEW}`: {
                            isUpdateFromWebview = true;
                            if (getAlignToOrigin()) {
                                postMessage(MessageType.ALIGN);
                            }
                            if (event.data?.bpmn) {
                                await this.write(document, event.data.bpmn);
                            }
                            break;
                        }
                        case `${BpmnModeler.VIEWTYPE}.${MessageType.INFO}`: {
                            Logger.info(
                                "[Miranum.Modeler.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            break;
                        }
                        case `${BpmnModeler.VIEWTYPE}.${MessageType.ERROR}`: {
                            Logger.error(
                                "[Miranum.Modeler.Webview]",
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
                        "[Miranum.Modeler]",
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
                        const additionalFiles = await artifacts;
                        data = {
                            executionPlatformVersion:
                                this.getModelerExecutionPlatformVersion(
                                    document.getText(),
                                ),
                            bpmn: document.getText(),
                            additionalFiles,
                        };
                        break;
                    }
                    case MessageType.RESTORE: {
                        data = {
                            bpmn: isBuffer ? document.getText() : undefined,
                            executionPlatformVersion: isBuffer
                                ? this.getModelerExecutionPlatformVersion(
                                      document.getText(),
                                  )
                                : ExecutionPlatformVersion.None,
                            additionalFiles: watcher.isUnresponsive(document.uri.path)
                                ? await watcher.getChangedData()
                                : undefined,
                        };
                        break;
                    }
                    default: {
                        data = {
                            bpmn: document.getText(),
                            executionPlatformVersion:
                                this.getModelerExecutionPlatformVersion(
                                    document.getText(),
                                ),
                        };
                        break;
                    }
                }

                try {
                    if (
                        await webviewPanel.webview.postMessage({
                            type: `${BpmnModeler.VIEWTYPE}.${msgType}`,
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
                            "[Miranum.Modeler]",
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
                            "[Miranum.Modeler]",
                            `(Webview: ${webviewPanel.title})`,
                            message,
                        );
                    }
                }
            }
        };

        // (2) EventListener on saving
        const saveDocumentSubscription = workspace.onDidSaveTextDocument(() => {
            Logger.info(
                "[Miranum.Modeler]",
                `(Webview: ${webviewPanel.title})`,
                `Document was saved (${document.fileName})`,
            );
        });

        // (3) EventListener on changes
        const changeDocumentSubscription = workspace.onDidChangeTextDocument((event) => {
            if (
                event.document.uri.toString() === document.uri.toString() &&
                event.contentChanges.length !== 0 &&
                !isUpdateFromWebview
            ) {
                if (!webviewPanel.visible) {
                    // if the webview is not visible, we cannot send a message
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
                        postMessage(MessageType.MSGFROMEXTENSION);
                        break;
                    }
                }
            }
            isUpdateFromWebview = false;
        });

        // (4) EventListener on switching tabs
        webviewPanel.onDidChangeViewState((wp) => {
            switch (true) {
                case wp.webviewPanel.active: {
                    StandardTextEditor.document = document;
                    // break omitted
                }
                case wp.webviewPanel.visible: {
                    break;
                }
            }
        });

        // (5) EventListener on closing tab
        webviewPanel.onDidDispose(() => {
            BpmnModeler.counter--;
            commands.executeCommand(
                "setContext",
                `${BpmnModeler.VIEWTYPE}.openCustomEditor`,
                BpmnModeler.counter,
            );

            watcher.unsubscribe(document.uri.path);
            changeDocumentSubscription.dispose();
            saveDocumentSubscription.dispose();
        });
        // <--- Create EventListener for the webview ---
    }

    /**
     * Depending on the opened BPMN file, either the modeler for Camunda 7 or Camunda 8 is created.
     * @param xmlString The content of the opened BPMN file.
     * @private
     */
    private getModelerExecutionPlatformVersion(
        xmlString: string,
    ): ExecutionPlatformVersion {
        const regex = /modeler:executionPlatformVersion="([78])\.\d+\.\d+"/;

        const match = xmlString.match(regex);

        if (match) {
            const version = match[1];
            if (version === "7") {
                return ExecutionPlatformVersion.Camunda7;
            } else if (version === "8") {
                return ExecutionPlatformVersion.Camunda8;
            }
        }
        return ExecutionPlatformVersion.None;
    }

    /**
     * Get the HTML-Structure we want for our webview.
     * @param webview The reference to the webview.
     * @param extensionUri The path to the directory where the extension is installed.
     * @private
     */
    private getHtmlForWebview(webview: Webview, extensionUri: Uri) {
        const pathToWebview = Uri.joinPath(extensionUri, "miranum-modeler-bpmn-webview");

        const scriptUri = webview.asWebviewUri(Uri.joinPath(pathToWebview, "index.js"));
        const styleUri = webview.asWebviewUri(Uri.joinPath(pathToWebview, "index.css"));
        const fontBpmn = webview.asWebviewUri(
            Uri.joinPath(pathToWebview, "css", "bpmn.css"),
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
                    font-src ${webview.cspSource} data:;
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
                  const globalViewType = "${BpmnModeler.VIEWTYPE}";
              </script>
              <script type="text/javascript" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
    }

    /**
     * Create a nonce for our Content-Security-Policy
     * @private
     */
    private getNonce(): string {
        let text = "";
        const possible =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Makes the [lodash.debounce](https://lodash.com/docs/4.17.15#debounce) function async-friendly
     * @param func The function to be called after a given time.
     * @param wait The time that should be awaited before calling the given function again.
     * @private
     */
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

    /**
     * Write the changes made to the BPMN Diagram to the file/document.
     * @param document The file that contains the XML.
     * @param text The XML that gets written to the file.
     * @private
     */
    private async writeChangesToDocument(
        document: TextDocument,
        text: string,
    ): Promise<boolean> {
        if (document.getText() === text) {
            return Promise.reject("No changes to apply!");
        }

        const edit = new WorkspaceEdit();

        edit.replace(document.uri, new Range(0, 0, document.lineCount, 0), text);

        return Promise.resolve(workspace.applyEdit(edit));
    }

    /**
     * Get the URI of the path to the root of the project.
     * If a workspace exists, the URI of the workspace is returned, otherwise the URI of the open document without the
     * filename.
     * @param document The URI of the open document.
     * @private
     */
    private getPathToProjectRoot(document: Uri): Uri {
        const workspaces = workspace.workspaceFolders;
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

    /**
     * Get the path to the miranum.json and it's content.
     * First, the directory of the opened BPMN file is searched. If nothing is found there, a recursive search is
     * performed in the parent directories until the root of the project is reached.
     * @param pathToProjectRoot The path to the root of the project.
     * @param path Path to the open .bpmn-file.
     * @private
     */
    private async getMiranumJson(
        pathToProjectRoot: Uri,
        path: Uri,
    ): Promise<{
        pathToMiranumJson?: Uri;
        miranumWorkspaceItems: MiranumWorkspaceItem[];
    }> {
        try {
            const pathToMiranumJson = await searchMiranumJson(path);
            return {
                pathToMiranumJson,
                miranumWorkspaceItems: await readMiranumJson(pathToMiranumJson),
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : `${error}`;
            Logger.error(
                "[Miranum.Modeler]",
                "Could not read miranum.json:",
                `\n${message}`,
            );
            return {
                pathToMiranumJson: undefined,
                miranumWorkspaceItems: getDefaultWorkspace(),
            };
        }

        async function searchMiranumJson(searchPath: Uri): Promise<Uri> {
            const dir = await workspace.fs.readDirectory(searchPath);

            if (
                !pathToProjectRoot ||
                !searchPath.toString().includes(pathToProjectRoot.toString())
            ) {
                throw Error("Could not find miranum.json within the project!");
            }

            if (dir.find((item) => item[0] === "miranum.json")) {
                return searchPath;
            } else {
                return searchMiranumJson(
                    Uri.parse(searchPath.toString().split("/").slice(0, -1).join("/")),
                );
            }
        }

        async function readMiranumJson(pathToMiranumJson: Uri) {
            // eslint-disable-next-line no-useless-catch
            try {
                const file = await workspace.fs.readFile(
                    Uri.joinPath(pathToMiranumJson, "miranum.json"),
                );
                const miranumWorkspaceItems: MiranumWorkspaceItem[] = JSON.parse(
                    Buffer.from(file).toString("utf-8"),
                ).workspace;
                return miranumWorkspaceItems;
            } catch (error) {
                throw error;
            }
        }

        function getDefaultWorkspace(): MiranumWorkspaceItem[] {
            return [
                {
                    type: "element-template",
                    path: "element-templates",
                    extension: ".json",
                },
            ];
        }
    }
}
