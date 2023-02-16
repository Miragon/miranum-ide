import * as vscode from "vscode";
import { Artifact, MiranumCore } from "@miranum-ide/miranum-core";
import { getWebviewHTML } from "../shared/webview";
import { saveFile, selectFiles } from "../shared/fs-helpers";
import { showErrorMessage, showInfoMessage } from "../shared/message";

// TODO fixme
// We should use proper event sourcing and rethink the architecture of this console
export async function registerGenerateCommands(context: vscode.ExtensionContext, miranumCore: MiranumCore): Promise<vscode.Disposable[]> {
    const commands: vscode.Disposable[] = [];
    const pathToWebview = vscode.Uri.joinPath(context.extensionUri, "miranum-console-webview");

    // TODO switch this to a single command
    const generateFileCommand = vscode.commands.registerCommand("miranum.generateFile", async (path: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
            "generate",
            "Generate",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [pathToWebview],
            },
        );
        panel.webview.html = getWebviewHTML(panel.webview, context.extensionUri);

        const cache = {
            name: "",
            type: "",
            path: "",
        };

        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const sendEvent = (event: any) => {
            panel.webview.postMessage(event);
        };

        // initialization

        // path or workspacefolders may be undefined
        if (path) {
            cache.path = path.fsPath;
        } else if (vscode.workspace.workspaceFolders) {
            cache.path = vscode.workspace.workspaceFolders[0].uri.path;
        }

        // init event
        sendEvent({
            type: "show",
            command: "generateFile",
            data: {
                name: cache.name,
                type: cache.type,
                currentPath: cache.path,
                miranumJson: miranumCore.projectConfig,
            },
        });

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case "generateArtifact":
                    await generate(event.data.artifact, event.data.path);
                    break;
                case "openFilePicker":
                    selectFiles()
                        .then(files => {
                            if (files.length > 0) {
                                cache.path = files[0].path;
                                sendEvent({
                                    type: "show",
                                    command: "generateFile",
                                    data: {
                                        name: cache.name,
                                        type: cache.type,
                                        currentPath: cache.path,
                                        miranumJson: miranumCore.projectConfig,
                                    },
                                });
                            }
                        })
                        .catch(err => {
                            showErrorMessage("Could not find selected file or path, please try again");
                        });
                    break;
                case "changedInput":
                    cache.name = event.data.name;
                    cache.type = event.data.type;
                    break;
            }
        });

        panel.onDidChangeViewState( () => {
            if (panel.visible) {
                sendEvent({
                    type: "show",
                    command: "generateFile",
                    data: {
                        name: cache.name,
                        type: cache.type,
                        currentPath: cache.path,
                        miranumJson: miranumCore.projectConfig,
                    },
                });
            }
        });
    });
    commands.push(generateFileCommand);

    const generateProjectCommand = vscode.commands.registerCommand("miranum.generateProject", async (path: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
            "generateProject",
            "Generate Project",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [pathToWebview],
            },
        );
        panel.webview.html = getWebviewHTML(panel.webview, context.extensionUri);

        const cache = {
            name: "",
            path: "",
        };

        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const sendEvent = (event: any) => {
            panel.webview.postMessage(event);
        };

        // initialization

        // path or workspacefolders may be undefined
        if (path) {
            cache.path = path.fsPath;
        } else if (vscode.workspace.workspaceFolders) {
            cache.path = vscode.workspace.workspaceFolders[0].uri.path;
        }

        // init event
        sendEvent({
            type: "show",                   //this is for later, to enable update events
            command: "generateProject",
            data: {
                name: cache.name,
                currentPath: cache.path,
            },
        });

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case "generateProject":
                    for (const artifact of event.data.artifacts) {
                        await generate(artifact, `${event.data.path}/${event.data.name}`);
                    }
                    break;
                case "openFilePicker":
                    selectFiles()
                        .then(files => {
                            if (files.length > 0) {
                                cache.path = files[0].path;
                                sendEvent({
                                    type: "show",
                                    command: "generateProject",
                                    data: {
                                        name: cache.name,
                                        currentPath: cache.path,
                                    },
                                });
                            }
                        })
                        .catch(err => {
                            showErrorMessage("Could not find selected file or path, please try again");
                        });
                    break;
                case "changedInput":
                    cache.name = event.data.name;
                    break;
            }
        });

        panel.onDidChangeViewState( () => {
            if (panel.visible) {
                sendEvent({
                    type: "show",
                    command: "generateProject",
                    data: {
                        name: cache.name,
                        currentPath: cache.path,
                    },
                });
            }
        });
    });
    commands.push(generateProjectCommand);

    return commands;
}

async function generate(artifact: Artifact, path: string): Promise<void> {
    try {
        if (!artifact.file.pathInProject) {
            throw Error(`Could not create file ${artifact.file.name}`);
        }
        const file = `${path}/${artifact.file.pathInProject}`.replace("//", "/");
        await saveFile(file, artifact.file.content);
        showInfoMessage(`SAVED ${artifact.file.name}.${artifact.file.extension}`);
    } catch (err) {
        showErrorMessage(`FAILED creating file ${artifact.file.name} with -> ${err}`);
        return Promise.reject(err);
    }
}
