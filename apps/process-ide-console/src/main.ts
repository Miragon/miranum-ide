import * as vscode from "vscode";
import { DigiwfLib} from "@miragon-process-ide/digiwf-lib";
import { generate } from "./app/generate/generate";
import { deployArtifact, getUriAndDeploy, mapProcessConfigToDigiwfLib } from "./app/deployment/deployment";
import { getGenerateWebview } from "./Webviews/Inputs/generateInput";
import {Uri} from "vscode";

let digiwfLib = new DigiwfLib();


export async function activate(context: vscode.ExtensionContext) {
    digiwfLib = await mapProcessConfigToDigiwfLib(context.extensionUri);

    const deploy = vscode.commands.registerCommand("process-ide.deploy", async (path: vscode.Uri, target: string) => {
        target = "local";
        await deployArtifact(path, target);
    });
    const deployDev = vscode.commands.registerCommand("process-ide.deployDev", async (path: vscode.Uri) => {
        await deployArtifact(path, "dev");
    });
    const deployTest = vscode.commands.registerCommand("process-ide.deployTest", async (path: vscode.Uri) => {
        await deployArtifact(path, "test");
    });

    const deployAll = vscode.commands.registerCommand("process-ide.deployAll", async (path: vscode.Uri, target: string) => {
        target = "local";
        await getUriAndDeploy(path, target);
    });
    const deployAllDev = vscode.commands.registerCommand("process-ide.deployAllDev", async (path: vscode.Uri) => {
        await getUriAndDeploy(path, "dev");
    });
    const deployAllTest = vscode.commands.registerCommand("process-ide.deployAllTest", async (path: vscode.Uri) => {
        await getUriAndDeploy(path, "test");
    });

    const generateFile = vscode.commands.registerCommand("process-ide.generateFile", async () => {
        const panel = vscode.window.createWebviewPanel(
            'generate',
            'Generate',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, '..', '..', 'apps', 'webviews')]
            }
        );

        const scriptUrl = panel.webview.asWebviewUri(Uri.joinPath(context.extensionUri, '..', '..', 'apps', 'webviews')).toString();
        panel.webview.html = getGenerateWebview(scriptUrl, context.extensionPath, false);

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case 'generate':
                    // eslint-disable-next-line no-case-declarations
                    const artifact = await digiwfLib.generateArtifact(event.name, event.type, "");
                    await generate(artifact, event.path);
                    break;
            }
        });
    });

    const generateProject = vscode.commands.registerCommand("process-ide.generateProject", async () => {
        const panel = vscode.window.createWebviewPanel(
            'generateProject',
            'Generate Project',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, '..', '..', 'apps', 'webviews')]
            }
        );
        const scriptUrl = panel.webview.asWebviewUri(Uri.joinPath(context.extensionUri, '..', '..', 'apps', 'webviews')).toString();
        panel.webview.html = getGenerateWebview(scriptUrl, context.extensionPath, true);

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case 'generateProject':
                    // eslint-disable-next-line no-case-declarations
                    const artifacts = await digiwfLib.initProject(event.name);
                    for (const artifact of artifacts) {
                        await generate(artifact, `${event.path}/${event.name}`);
                    }
            }
        });
    });

    context.subscriptions.push(deploy, deployDev, deployTest,
                            deployAll, deployAllDev, deployAllTest,
                            generateFile, generateProject);
}

//     -----------------------------HELPERS-----------------------------     \\
export function getDigiWfLib(): DigiwfLib {
    return digiwfLib;
}
