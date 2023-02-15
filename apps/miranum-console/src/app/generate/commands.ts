import * as vscode from "vscode";
import { Artifact, MiranumCore } from "@miranum-ide/miranum-core";
import { getWebviewHTML } from "../shared/webview";
import { openFilePicker, saveFile } from "../shared/fs-helpers";
import { showErrorMessage, showInfoMessage } from "../shared/message";

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
                localResourceRoots: [pathToWebview]
            },
        );
        panel.webview.html = getWebviewHTML(panel.webview, context.extensionUri);

        // TODO implement event sourcing or proper caching
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const userInputCache: GenerateFileMessage = { name: "", type: "bpmn", path: path ? path.fsPath : (vscode.workspace.workspaceFolders[0].uri.path ?? "") };
        // TODO split this into 2 events
        const sendFileMessage = () => {
            panel.webview.postMessage({
                type: "show", //this is for later, to enable update events
                command: "generateFile",
                data: {
                    name: userInputCache.name,
                    type: userInputCache.type,
                    currentPath: userInputCache.path,
                    miranumJson: miranumCore.projectConfig,
                },
            });
        };

        //initialisation
        sendFileMessage();

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case "generateArtifact":
                    await generate(event.data.artifact, event.data.path);
                    break;
                case "openFilePicker":
                    openFilePicker(vscode.window, userInputCache, sendFileMessage);
                    break;
                case "changedInput":
                    userInputCache.name = event.data.name;
                    userInputCache.type = event.data.type;
                    break;
            }
        });

        panel.onDidChangeViewState( () => {
            if (panel.visible) {
                sendFileMessage();
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

        // TODO implement event sourcing or proper caching
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const userInputCache: GenerateProjectMessage = { name: "", path: path ? path.fsPath : (vscode.workspace.workspaceFolders[0].uri.path ?? "") };
        // TODO split this into 2 events
        const sendProjectMessage = () => {
            panel.webview.postMessage({
                type: "show",                   //this is for later, to enable update events
                command: "generateProject",
                data: {
                    name: userInputCache.name,
                    currentPath: userInputCache.path,
                },
            });
        };

        //initialisation
        sendProjectMessage();

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case "generateProject":
                    for (const artifact of event.data.artifacts) {
                        await generate(artifact, `${event.data.path}/${event.data.name}`);
                    }
                    break;
                case "openFilePicker":
                    openFilePicker(vscode.window, userInputCache, sendProjectMessage);
                    break;
                case "changedInput":
                    userInputCache.name = event.data.name;
                    break;
            }
        });

        panel.onDidChangeViewState( () => {
            if (panel.visible) {
                sendProjectMessage();
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
