import * as vscode from "vscode";
import { generate } from "./app/generate/generate";
import { fileDeploymentSupported, getArtifact, getArtifacts } from "./app/deployment/deployment";
import * as colors from "colors";
import { getGenerateWebview } from "./Webviews/Inputs/generateInput";
import {
    createDigiwfLib,
    DigiWFDeploymentPlugin,
    DigiwfDeploymentPluginRest,
    DigiwfLib
} from "@miragon-process-ide/digiwf-lib";

const ws = vscode.workspace;

async function initDigiwfLib(): Promise<DigiwfLib> {
    try {
        const processIdeJSON = await ws.fs.readFile(vscode.Uri.joinPath(vscode.Uri.file(ws.rootPath ?? ""), "process-ide.json"));

        const processIdeConfig = JSON.parse(processIdeJSON.toString());
        const plugins: DigiWFDeploymentPlugin[] = [];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        processIdeConfig.deployment.forEach(p => {
            plugins.push(new DigiwfDeploymentPluginRest(p.plugin, p.targetEnvironments));
        });
        return createDigiwfLib(processIdeConfig.projectVersion, processIdeConfig.name, processIdeConfig.workspace, plugins);
    } catch (e) {
        return new DigiwfLib();
    }
}

export async function activate(context: vscode.ExtensionContext) {
    const digiwfLib = await initDigiwfLib();
    const pathToWebview = vscode.Uri.joinPath(context.extensionUri, 'process-ide-console-webview');

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
                localResourceRoots: [pathToWebview]
            }
        );

        const scriptUrl = panel.webview.asWebviewUri(pathToWebview).toString();
        panel.webview.html = getGenerateWebview(scriptUrl, ws.rootPath ?? "", false);

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
                localResourceRoots: [pathToWebview]
            }
        );
        const scriptUrl = panel.webview.asWebviewUri(pathToWebview).toString();
        panel.webview.html = getGenerateWebview(scriptUrl, ws.rootPath ?? "", true);

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case 'generateProject':
                    // eslint-disable-next-line no-case-declarations
                    const artifacts = await digiwfLib.initProject(event.name);
                    for (const artifact of artifacts) {
                        await generate(artifact, `${event.path}/${event.name}`);
                    }
                    break;
                case 'openFilePicker':
                    vscode.window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false
                    }).then( fileUri => {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        panel.webview.html = getGenerateWebview(scriptUrl, fileUri[0].path, true);
                    });
                    break;
            }
        });
    });

    context.subscriptions.push(generateFile, generateProject);
}
