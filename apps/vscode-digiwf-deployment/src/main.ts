import * as vscode from "vscode";
import { DigiwfLib} from "@miragon-process-ide/digiwf-lib";
import { generate } from "./app/generate/generate";
import { deployArtifact, getUriAndDeploy, mapProcessConfigToDigiwfLib } from "./app/deployment/deployment";

let digiwfLib = new DigiwfLib();


export async function activate(context: vscode.ExtensionContext) {
    digiwfLib = await mapProcessConfigToDigiwfLib();

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
            'catCoding',
            'Generate',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );
        panel.webview.html = getGenerateFileWebview();

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case 'generate':
                    // eslint-disable-next-line no-case-declarations
                    const artifact = await digiwfLib.generateArtifact(event.name, event.type, "");
                    await generate(artifact, event.path);
            }
        });
    });

    const generateProject = vscode.commands.registerCommand("process-ide.generateProject", async () => {
        const panel = vscode.window.createWebviewPanel(
            'catCoding',
            'Generate Project',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );
        panel.webview.html = getGenerateProjectWebview();

        panel.webview.onDidReceiveMessage( async (event) => {
            switch (event.message) {
                case 'generateProject':
                    // eslint-disable-next-line no-case-declarations
                    const artifacts = await digiwfLib.initProject(event.name);
                    for (const artifact of artifacts) {
                        await generate(artifact, event.path);
                    }
            }
        });
    });

    context.subscriptions.push(deploy, deployDev, deployTest,
                            deployAll, deployAllDev, deployAllTest,
                            generateFile, generateProject);
}

// eslint-disable-next-line
export function deactivate() { }

//     -----------------------------HELPERS-----------------------------     \\
//evtl. später in deploy auslagern?
export function getDigiWfLib(): DigiwfLib {
    return digiwfLib;
}

//     ----------------------------Web-Views----------------------------     \\
function getGenerateFileWebview() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generate</title>
    </head>
    <body>
        <div>
            <h3>name:</h3>
            <textarea id="name">ProjectName</textarea>
        </div>
        <div>
            <h3>type:</h3>
            <textarea id="type">bpmn</textarea>
        </div>
        <div>
            <h3>Path:</h3>
            <textarea id="path">Users/jakobmertl/Desktop</textarea>
        </div>
        <button id="confirm">generate</button>
        <script>
            const vscode = acquireVsCodeApi();
            let name = "test Project";
            let type = "bpmn";
            let path = "Users/jakobmertl/Desktop";

            confirm = document.getElementById("confirm");
            confirm.addEventListener("click", async () => {
                name = document.getElementById("name").value;
                type = document.getElementById("type").value;
                path = document.getElementById("path").value;
                if(name && type && path) {
                    vscode.postMessage({
                        message:'generate', name: name, type: type, path: path
                    })
                }
            });

        </script>
    </body>
    </html>`;
}

function getGenerateProjectWebview() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generate a Project</title>
    </head>
    <body>
        <div>
            <h3>Project name:</h3>
            <textarea id="name">ProjectName</textarea>
        </div>
        <div>
            <h3>Path:</h3>
            <textarea id="path">Users/jakobmertl/Desktop/ProjectName</textarea>
        </div>
        <button id="confirm">generate</button>
        <script>
            const vscode = acquireVsCodeApi();
            let name = "test Project";
            let path = "Users/jakobmertl/Desktop";

            confirm = document.getElementById("confirm");
            confirm.addEventListener("click", async () => {
                name = document.getElementById("name").value;
                path = document.getElementById("path").value;
                if(name && path) {
                    vscode.postMessage({
                        message:'generateProject', name: name, path: path
                    })
                }
            });

        </script>
    </body>
    </html>`;
}