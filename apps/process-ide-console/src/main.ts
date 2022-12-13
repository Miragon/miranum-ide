import * as vscode from "vscode";
import {
    createDigiwfLib,
    DigiWFDeploymentPlugin,
    DigiwfDeploymentPluginRest,
    DigiwfLib
} from "@miragon-process-ide/digiwf-lib";
import {createDeployment} from "./app/deployment/deploymentAPI";
import {createGenerateFile, createGenerateProject} from "./app/generate/generateAPI";

export async function activate(context: vscode.ExtensionContext) {
    const digiwfLib = await initDigiwfLib();
    if(!digiwfLib.projectConfig) {
        vscode.window.showInformationMessage("couldn't find process-ide.json");
    }

    createDeployment(context, digiwfLib);
    createGenerateFile(context, digiwfLib);
    createGenerateProject(context);
}


async function initDigiwfLib(): Promise<DigiwfLib> {
    const ws = vscode.workspace;
    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const processIdeJSON = await ws.fs.readFile(vscode.Uri.joinPath(ws.workspaceFolders[0].uri, "process-ide.json"));

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
