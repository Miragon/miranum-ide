import * as vscode from "vscode";
import { initMiranumCore } from "./app/shared/fs-helpers";
import { registerDeploymentCommands } from "./app/deployment/commands";
import { showErrorMessage } from "./app/shared/message";
import { registerGenerateCommands } from "./app/generate/commands";
import { MiranumTreeDataProvider } from "./app/MiranumTreeDataProvider";

export async function activate(context: vscode.ExtensionContext) {
    const miranumCore = await initMiranumCore();

    // generate
    const generateCommands = await registerGenerateCommands(context, miranumCore);
    generateCommands.forEach((command) => context.subscriptions.push(command));

    // deployment
    try {
        const deploymentCommands = await registerDeploymentCommands(
            context,
            miranumCore,
        );
        deploymentCommands.forEach((command) => context.subscriptions.push(command));
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        showErrorMessage(err.message);
    }

    const workspace =
        vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
            ? vscode.workspace.workspaceFolders[0]
            : undefined;
    vscode.window.registerTreeDataProvider(
        "project-view",
        new MiranumTreeDataProvider(workspace),
    );
}
