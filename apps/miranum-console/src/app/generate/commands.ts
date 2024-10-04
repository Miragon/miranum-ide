import * as vscode from "vscode";
import { Uri } from "vscode";
import { Artifact, MiranumCore } from "@miranum-ide/miranum-core";
import { VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";
import {
    ConsoleData,
    FileData,
    MessageType,
} from "@miranum-ide/vscode/shared/miranum-console";
import { Logger } from "@miranum-ide/vscode/miranum-vscode";
import { saveFile, selectFiles } from "../shared/fs-helpers";
import { showErrorMessage, showInfoMessage } from "../shared/message";
import { ConsolePanel } from "../vscode/ConsolePanel";

// FIXME We should use proper event sourcing and rethink the architecture of this console
export async function registerGenerateCommands(
    context: vscode.ExtensionContext,
    miranumCore: MiranumCore,
): Promise<vscode.Disposable[]> {
    const commands: vscode.Disposable[] = [];

    // TODO switch this to a single command
    const generateFileCommand = vscode.commands.registerCommand(
        "miranum.generateFile",
        async (path: vscode.Uri) => {
            const panel = ConsolePanel.createOrShow(context.extensionUri);

            const cache: FileData = {
                name: "",
                type: "",
                path: "",
            };

            // initialization

            // path or workspaceFolders may be undefined
            if (path) {
                cache.path = path.fsPath;
            } else if (vscode.workspace.workspaceFolders) {
                cache.path = vscode.workspace.workspaceFolders[0].uri.path;
            }

            // init event
            panel.postMessage({
                type: `${ConsolePanel.viewType}.${MessageType.SHOW}`, // "show",
                data: {
                    command: "generateFile",
                    miranumJson: miranumCore.projectConfig,
                    fileData: {
                        name: cache.name,
                        path: cache.path,
                        type: cache.type,
                    },
                },
            });

            panel.onDidReceiveMessage(async (event: VscMessage<ConsoleData>) => {
                const data = event.data?.fileData;
                switch (event.type) {
                    case `${ConsolePanel.viewType}.${MessageType.GENERATEARTIFACT}`:
                        // case "generateArtifact":
                        if (
                            data &&
                            data.artifact &&
                            !Array.isArray(data.artifact) &&
                            data.path
                        ) {
                            await generate(data.artifact, data.path);
                            vscode.commands.executeCommand("miranum.treeView.refresh");
                        }
                        break;
                    case `${ConsolePanel.viewType}.${MessageType.OPENFILEPICKER}`:
                        // case "openFilePicker":
                        selectFiles()
                            .then((files) => {
                                if (files.length > 0) {
                                    cache.path = files[0].path;
                                    panel.postMessage({
                                        type: `${ConsolePanel.viewType}.${MessageType.SHOW}`, // "show",
                                        data: {
                                            command: "generateFile",
                                            miranumJson: miranumCore.projectConfig,
                                            fileData: {
                                                name: cache.name,
                                                type: cache.type,
                                                path: cache.path,
                                            },
                                        },
                                    });
                                }
                            })
                            .catch((err) => {
                                showErrorMessage(
                                    "Could not find selected file or path, please try again",
                                );
                            });
                        break;
                    case `${ConsolePanel.viewType}.${MessageType.CHANGEDINPUT}`:
                        // case "changedInput":
                        if (data && data.name && data.type) {
                            cache.name = data.name;
                            cache.type = data.type;
                        }
                        break;
                }
            });
            panel.onDidChangeViewState(() => {
                postMessage({
                    type: `${ConsolePanel.viewType}.${MessageType.SHOW}`, // "show",
                    command: "generateFile",
                    data: {
                        name: cache.name,
                        type: cache.type,
                        path: cache.path,
                        miranumJson: miranumCore.projectConfig,
                    },
                });
            });
        },
    );
    commands.push(generateFileCommand);

    const generateProjectCommand = vscode.commands.registerCommand(
        "miranum.generateProject",
        async (path: vscode.Uri) => {
            const panel = ConsolePanel.createOrShow(context.extensionUri);

            const cache: FileData = {
                name: "",
                path: "",
            };

            // initialization

            // path or workspacefolders may be undefined
            if (path) {
                cache.path = path.fsPath;
            } else if (vscode.workspace.workspaceFolders) {
                cache.path = vscode.workspace.workspaceFolders[0].uri.path;
            }

            // init event
            panel.postMessage({
                type: `${ConsolePanel.viewType}.${MessageType.SHOW}`, // "show",
                data: {
                    command: "generateProject",
                    fileData: {
                        name: cache.name,
                        path: cache.path,
                    },
                },
            });

            panel.onDidReceiveMessage(async (event: VscMessage<ConsoleData>) => {
                const data = event.data?.fileData;
                switch (event.type) {
                    case `${ConsolePanel.viewType}.${MessageType.GENERATEPROJECT}`:
                        // case "generateProject":
                        if (data && data.artifact && Array.isArray(data.artifact)) {
                            const workspace: Uri = Uri.file(`${data.path}/${data.name}`);

                            for (const artifact of data.artifact) {
                                await generate(artifact, `${data.path}/${data.name}`);
                            }

                            // FIXME: This will switch to the "explorer" view.
                            // open new created workspace
                            vscode.commands.executeCommand(
                                "vscode.openFolder",
                                workspace,
                            );
                        }
                        break;
                    case `${ConsolePanel.viewType}.${MessageType.OPENFILEPICKER}`:
                        // case "openFilePicker":
                        selectFiles()
                            .then((files) => {
                                if (files.length > 0) {
                                    cache.path = files[0].path;
                                    panel.postMessage({
                                        type: `${ConsolePanel.viewType}.${MessageType.SHOW}`, // "show",
                                        data: {
                                            command: "generateProject",
                                            fileData: {
                                                name: cache.name,
                                                path: cache.path,
                                            },
                                        },
                                    });
                                }
                            })
                            .catch((err) => {
                                showErrorMessage(
                                    "Could not find selected file or path, please try again",
                                );
                            });
                        break;
                    case `${ConsolePanel.viewType}.${MessageType.CHANGEDINPUT}`:
                        // case "changedInput":
                        if (data && data.name) {
                            cache.name = data.name;
                        }
                        break;
                }
            });

            panel.onDidChangeViewState(() => {
                panel.postMessage({
                    type: `${ConsolePanel.viewType}.${MessageType.SHOW}`, // "show",
                    data: {
                        command: "generateProject",
                        fileData: {
                            name: cache.name,
                            path: cache.path,
                        },
                    },
                });
            });
        },
    );
    commands.push(generateProjectCommand);

    return commands;
}

async function generate(artifact: Artifact, path: string): Promise<void> {
    try {
        if (!artifact.file.pathInProject) {
            const errMsg = `[Miranum.Console] Could not create file ${artifact.file.name}`;
            Logger.error(errMsg);
            throw Error(errMsg);
        }
        const file = `${path}/${artifact.file.pathInProject}`.replace("//", "/");
        await saveFile(file, artifact.file.content);
        showInfoMessage(`SAVED ${artifact.file.name}.${artifact.file.extension}`);
    } catch (err) {
        showErrorMessage(`FAILED creating file ${artifact.file.name} with -> ${err}`);
        return Promise.reject(err);
    }
}
