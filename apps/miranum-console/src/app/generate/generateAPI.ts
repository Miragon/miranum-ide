import * as vscode from "vscode";
import {getGenerateWebview} from "../../Webviews/Inputs/generateInput";
import {generateFileMessage, generateProjectMessage} from "../../types/MessageAPI";
import {generate} from "./generate";
import {MiranumCore} from "@miranum-ide/miranum-core";

export function createGenerateFile(context: vscode.ExtensionContext, digiwfLib: MiranumCore) {
    const pathToWebview = vscode.Uri.joinPath(context.extensionUri, 'miranum-console-webview');

    const generateFile = vscode.commands.registerCommand("miranum.generateFile", async (path: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
            'generate',
            'Generate',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [pathToWebview]
            }
        );
        panel.webview.html = getGenerateWebview(panel.webview.asWebviewUri(pathToWebview).toString());

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
                    openFilePicker(vscode.window, userInputCache, sendFileMessage);
                    break;
                case 'changedInput':
                    userInputCache.name = event.data.name;
                    userInputCache.type = event.data.type;
                    break;
            }
        });

        panel.onDidChangeViewState( () => {
            if(panel.visible) {
                sendFileMessage();
            }
        });
    });

    context.subscriptions.push(generateFile);
}


export function createGenerateProject(context: vscode.ExtensionContext) {
    const pathToWebview = vscode.Uri.joinPath(context.extensionUri, 'miranum-console-webview');

    const generateProject = vscode.commands.registerCommand("miranum.generateProject", async (path: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
            'generateProject',
            'Generate Project',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [pathToWebview]
            }
        );
        panel.webview.html = getGenerateWebview(panel.webview.asWebviewUri(pathToWebview).toString());

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
                    for (const artifact of event.data.artifacts) {
                        await generate(artifact, `${event.data.path}/${event.data.name}`);
                    }
                    break;
                case 'openFilePicker':
                    openFilePicker(vscode.window, userInputCache, sendProjectMessage);
                    break;
                case 'changedInput':
                    userInputCache.name = event.data.name;
                    break;
            }
        });

        panel.onDidChangeViewState( () => {
            if(panel.visible) {
                sendProjectMessage();
            }
        });
    });

    context.subscriptions.push(generateProject);
}


//     -----------------------------HELPERS-----------------------------     \\

// eslint-disable-next-line @typescript-eslint/ban-types
function openFilePicker (window: any, userInputCache: generateProjectMessage, sendProjectMessage: Function) {
    window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false
    }).then( (fileUri: { path: string; }[]) => {
        if(fileUri) {
            userInputCache.path = fileUri[0].path;
            sendProjectMessage();
        } else {
            window.showInformationMessage("Could not find selected Uri, please try again");
        }
    });
}
