import * as vscode from "vscode";
import {getGenerateWebview} from "../../Webviews/Inputs/generateInput";
import {generateFileMessage, generateProjectMessage} from "../../types/MessageAPI";
import {DigiwfLib} from "@miragon-process-ide/digiwf-lib";
import {generate} from "./generate";

export function createGenerateFile(context: vscode.ExtensionContext, digiwfLib: DigiwfLib) {
    const pathToWebview = vscode.Uri.joinPath(context.extensionUri, 'process-ide-console-webview');

    const generateFile = vscode.commands.registerCommand("process-ide.generateFile", async (path: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
            'generate',
            'Generate',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [pathToWebview]
            }
        );

        const scriptUrl = panel.webview.asWebviewUri(pathToWebview).toString();
        panel.webview.html = getGenerateWebview(scriptUrl);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const userInputCache: generateFileMessage = {name: "", type: "bpmn", path: path ? path.fsPath : (vscode.workspace.workspaceFolders[0].uri.path ?? "")};
        const sendFileMessage = () => {
            panel.webview.postMessage({
                type: "show",                   //this is for later, to enable update events
                command: "generateFile",
                data: {
                    name: userInputCache.name,
                    type: userInputCache.type,
                    currentPath: userInputCache.path,
                    processIDE: digiwfLib.projectConfig
                }
            });
        }

        //initialisation
        sendFileMessage();

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case 'generateArtifact':
                    await generate(event.data.artifact, event.data.path);
                    break;
                case 'openFilePicker':
                    vscode.window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false
                    }).then( fileUri => {
                        if(fileUri) {
                            userInputCache.path = fileUri[0].path;
                            sendFileMessage();
                        } else {
                            vscode.window.showInformationMessage("Could not find selected Uri, please try again");
                        }
                    });
                    break;
                case 'changedInput':
                    userInputCache.name = event.data.name;
                    userInputCache.type = event.data.type;
                    break;
            }
        });

        //setState
        panel.onDidChangeViewState( () => {
            if(panel.visible) {
                sendFileMessage();
            }
        });
    });

    context.subscriptions.push(generateFile);
}


export function createGenerateProject(context: vscode.ExtensionContext) {
    const pathToWebview = vscode.Uri.joinPath(context.extensionUri, 'process-ide-console-webview');

    const generateProject = vscode.commands.registerCommand("process-ide.generateProject", async (path: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
            'generateProject',
            'Generate Project',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [pathToWebview]
            }
        );

        const scriptUrl = panel.webview.asWebviewUri(pathToWebview).toString();
        panel.webview.html = getGenerateWebview(scriptUrl);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const userInputCache: generateProjectMessage = {name: "", path: path ? path.fsPath : (vscode.workspace.workspaceFolders[0].uri.path ?? "")};
        const sendProjectMessage = () => {
            panel.webview.postMessage({
                type: "show",                   //this is for later, to enable update events
                command: "generateProject",
                data: {
                    name: userInputCache.name,
                    currentPath: userInputCache.path
                }
            });
        }

        //initialisation
        sendProjectMessage();

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case 'generateProject':
                    // eslint-disable-next-line no-case-declarations
                    for (const artifact of event.data.artifacts) {
                        await generate(artifact, `${event.data.path}/${event.data.name}`);
                    }
                    break;
                case 'openFilePicker':
                    vscode.window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false
                    }).then( fileUri => {
                        if(fileUri) {
                            userInputCache.path = fileUri[0].path;
                            sendProjectMessage();
                        } else {
                            vscode.window.showInformationMessage("Could not find selected Uri, please try again");
                        }
                    });
                    break;
                case 'changedInput':
                    userInputCache.name = event.data.name;
                    break;
            }
        });

        //setState
        panel.onDidChangeViewState( () => {
            if(panel.visible) {
                sendProjectMessage();
            }
        });
    });

    context.subscriptions.push(generateProject);
}
