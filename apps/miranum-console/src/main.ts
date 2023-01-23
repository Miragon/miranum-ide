import * as vscode from "vscode";
import {
    createMiranumCore,
    MiranumDeploymentPlugin,
    MiranumDeploymentPluginRest,
    MiranumCore
} from "@miranum-ide/miranum-core";
import {createDeployment} from "./app/deployment/deploymentAPI";
import {createGenerateFile, createGenerateProject} from "./app/generate/generateAPI";

export async function activate(context: vscode.ExtensionContext) {
    const digiwfLib = await initDigiwfLib();
    if(!digiwfLib.projectConfig) {
        vscode.window.showInformationMessage("couldn't find miranum.json");
    }

    createDeployment(context, digiwfLib);
    createGenerateFile(context, digiwfLib);
    createGenerateProject(context);
}


async function initDigiwfLib(): Promise<MiranumCore> {
    const ws = vscode.workspace;
    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const processIdeJSON = await ws.fs.readFile(vscode.Uri.joinPath(ws.workspaceFolders[0].uri, "miranum.json"));

        const processIdeConfig = JSON.parse(processIdeJSON.toString());
        const plugins: MiranumDeploymentPlugin[] = [];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        processIdeConfig.deployment.forEach(p => {
            plugins.push(new MiranumDeploymentPluginRest(p.plugin, p.targetEnvironments));
        });
        return createMiranumCore(processIdeConfig.projectVersion, processIdeConfig.name, processIdeConfig.workspace, plugins);
    } catch (e) {
        return new MiranumCore();
    }
}
