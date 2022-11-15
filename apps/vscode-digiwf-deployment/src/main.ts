import * as vscode from "vscode";
import * as colors from "colors";
import { DigiwfLib} from "@miragon-process-ide/digiwf-lib";
import { generate } from "./app/generate/generate";
import { mapProcessConfigToDigiwfLib } from "./app/deployment/deployment";

let digiwfLib = new DigiwfLib();
const fs = vscode.workspace.fs;


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

    const generateFile = vscode.commands.registerCommand("process-ide.generateFile", async (name: string, type: string, path: string) => {
        name = "test";
        type = "bpmn";
        //absoluter Pfad notwendig
        path = "Users/jakobmertl/Desktop";
        const artifact = await digiwfLib.generateArtifact(name, type, "");
        await generate(artifact, path);
        vscode.window.showInformationMessage(`generated ${name}.${type}`);
    });

    const generateProject = vscode.commands.registerCommand("process-ide.generateProject", async (name: string, path: string) => {
        const panel = vscode.window.createWebviewPanel(
            'catCoding',
            'Generate',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );
        panel.webview.html = getInputWebviewContent();

        // const artifacts = await digiwfLib.initProject(name);
        // for (const artifact of artifacts) {
        //     await generate(artifact, path);
        // }
        vscode.window.showInformationMessage(`generated ${name}`);
    });
    
    context.subscriptions.push(deploy, deployDev, deployTest, 
                            deployAll, deployAllDev, deployAllTest,
                            generateFile, generateProject);
}

// eslint-disable-next-line
export function deactivate() { }

function getInputWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generate</title>
    </head>
    <body>
        <script src="app.js"></script>
    </body>
    </html>`;
}


//     -----------------------------HELPERS-----------------------------     \\

export async function deployArtifact(path: vscode.Uri, target: string) {
    const content = (await fs.readFile(path)).toString();
    const file = path.fsPath.substring(path.fsPath.lastIndexOf('/')+1).split('.');
    try {
        const artifact = await digiwfLib.deploy(target, {
            "type": file[1],
            "project": "test" ?? "",     //should be the actual project-name
            "file": {
                "content": content,
                "extension": file[1],
                "name": file[0]
            }
        });
        vscode.window.showInformationMessage(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + target);
    } catch(err: any) {
        console.log(colors.red.bold("FAILED ") + ` deploying ${file} with -> ${err}`);
        vscode.window.showInformationMessage(err.msg);
    }
}

export async function getUriAndDeploy(path: vscode.Uri, target: string) {
    const files = await fs.readDirectory(path);
    for (const file of files) {
        const filePath = vscode.Uri.file(path.fsPath + "/" + file[0]);
        if(file[1] != 1) {
            getUriAndDeploy(filePath, target);
        } else {
            //only form and bpmn
            await deployArtifact(filePath, target);
        }
    }
}