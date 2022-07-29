import { digiwfLib } from "@miragon-process-ide/digiwf-lib";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {

    const lib = digiwfLib();

    const disposable = vscode.commands.registerCommand("vscode-digiwf-deployment.helloWorld", () => {
        console.log(lib);
        vscode.window.showInformationMessage("Hello World from vscode-digiwf-deployment!");
    });

    context.subscriptions.push(disposable);
}

// eslint-disable-next-line
export function deactivate() { }
