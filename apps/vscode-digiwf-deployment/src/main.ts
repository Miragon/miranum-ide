import * as vscode from "vscode";
import * as colors from "colors";
import { Artifact, DigiwfLib } from "@miragon-process-ide/digiwf-lib";
import { saveFile } from "./app/filesystem/fs";

export function activate(context: vscode.ExtensionContext) {
    const digiwfLib = new DigiwfLib;

    const deploy = vscode.commands.registerCommand("process-ide.deploy", async (path: string, type: string, project: string | undefined, target: string) => {
        // const file = await getFile(path);
        //     const artifact = await digiwfLib.deploy(target, {
        //         "type": type,
        //         "project": project ?? "",
        //         "file": file
        //     });
        // console.log(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + target);
        const panel = vscode.window.createWebviewPanel(
            'catCoding',
            'Cat Coding',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );
        panel.webview.html = getWebviewContent();

        vscode.window.showInformationMessage(`deployed ${path}`);
    });

    const deployAll = vscode.commands.registerCommand("process-ide.deployAll", async (path: string, project: string | undefined, target: string) => {
        // const files = await getFiles(path);
        // for (const file of files) {
        //     try {
        //         let type = file.extension.replace(".", "").toLowerCase();
        //         if (type === "json") {
        //             path.includes("schema.json") ? type = "form" : type = "config";
        //         }
        //         const artifact = {
        //             "type": type,
        //             "project": project ?? "",
        //             "file": file
        //         }
        //         await digiwfLib.deploy(target, artifact);
        //         console.log(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + target);
        //     } catch (err) {
        //         console.log(colors.red.bold("FAILED ") + ` deploying ${file.name} with -> ${err}`);
        //     }
        // }

        vscode.window.showInformationMessage("deployed project");
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
        // const artifacts = await digiwfLib.initProject(name);
        // for (const artifact of artifacts) {
        //     await generate(artifact, path);
        // }
        vscode.window.showInformationMessage(`generated ${name}`);
    });
    
    context.subscriptions.push(deploy, deployAll, generateFile, generateProject);
}

// eslint-disable-next-line
export function deactivate() { }


//     -----------------------------HELPERS-----------------------------     \\

async function generate(artifact: Artifact, path: string): Promise<void> {
    try {
        if (!artifact.file.pathInProject) {
            const msg = `Could not create file ${artifact.file.name}`;
            vscode.window.showInformationMessage(colors.red.bold("FAILED ") + msg);
            return Promise.reject(msg);
        }
        await saveFile(path, artifact.file.pathInProject, artifact.file.content);

        let fileName = artifact.file.pathInProject;
        fileName = (fileName.charAt(0) === '/') ? fileName.slice(1, fileName.length) : fileName;
        vscode.window.showInformationMessage(colors.green.bold("SAVED ") + fileName);
    } catch (err) {
        vscode.window.showInformationMessage(colors.red.bold("FAILED ") + ` creating file ${artifact.file.name} with -> ${err}`);
        return Promise.reject(err);
    }
}



function getWebviewContent() {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cat Coding</title>
  </head>
  <body>
      <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
      <h1 id="lines-of-code-counter">0</h1>
  
      <script>
          const counter = document.getElementById('lines-of-code-counter');
  
          let count = 0;
          setInterval(() => {
              counter.textContent = count++;
          }, 100);
      </script>
  </body>
  </html>`;
  }