import * as vscode from "vscode";
import { Uri } from "vscode";
import { generate } from "./app/generate/generate";
import { fileDeploymentSupported, getArtifact, getArtifacts, initDigiwfLib } from "./app/deployment/deployment";
import * as colors from "colors";
import { getGenerateWebview } from "./Webviews/Inputs/generateInput";


export async function activate(context: vscode.ExtensionContext) {
    const digiwfLib = await initDigiwfLib();

    digiwfLib.projectConfig?.deployment.forEach(deployment => {
        deployment.targetEnvironments.forEach(env => {
            // deploy artifact
            const deployArtifactCommand = vscode.commands.registerCommand(`process-ide.deploy.${env.name}`, async (path: vscode.Uri) => {
                let artifact = await getArtifact(path);
                try {
                    artifact = await digiwfLib.deploy(env.name, artifact);
                    vscode.window.showInformationMessage(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + env.name);
                } catch(err: any) {
                    console.log(colors.red.bold("FAILED ") + ` deploying ${artifact.file.name} with -> ${err}`);
                    vscode.window.showInformationMessage(err.msg);
                }
            });
            context.subscriptions.push(deployArtifactCommand);

            // deploy project
            const deployAllCommand = vscode.commands.registerCommand(`process-ide.deployAll.${env.name}`, async (path: vscode.Uri) => {
                const artifacts = await getArtifacts(path);
                console.log(artifacts);
                for (const artifact of artifacts) {
                    try {
                        if (fileDeploymentSupported(artifact)) {
                            await digiwfLib.deploy(env.name, artifact);
                            vscode.window.showInformationMessage(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + env.name);
                        }
                    } catch(err: any) {
                        console.log(colors.red.bold("FAILED ") + ` deploying ${artifact.file.name} with -> ${err}`);
                        vscode.window.showInformationMessage(err.msg);
                    }
                }
            });
            context.subscriptions.push(deployAllCommand);
        });
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

    context.subscriptions.push(generateFile, generateProject);
}
