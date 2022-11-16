import * as vscode from "vscode";
import * as colors from "colors";
import { createDigiwfLib, DigiWFDeploymentPlugin, DigiwfDeploymentPluginRest, DigiwfLib} from "@miragon-process-ide/digiwf-lib";
import { getDigiWfLib } from "../../main";

const fs = vscode.workspace.fs;


export async function mapProcessConfigToDigiwfLib(): Promise<DigiwfLib> {
    const p =  vscode.Uri.file("@miragon-process-ide/process-ide.json"); //has to be relative
    const processIdeJson = (await fs.readFile(p)).toString();
    const processIdeConfig = JSON.parse(processIdeJson);
    const plugins: DigiWFDeploymentPlugin[] = [];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    processIdeConfig.deployment.forEach(p => {
        plugins.push(new DigiwfDeploymentPluginRest(p.plugin, p.targetEnvironments));
    });
    return createDigiwfLib(processIdeConfig.projectVersion, processIdeConfig.name, processIdeConfig.workspace, plugins);
}


export async function deployArtifact(path: vscode.Uri, target: string) {
    const digiwfLib = getDigiWfLib();
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
