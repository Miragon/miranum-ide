import * as vscode from "vscode";
import { BpmnModeler } from "./app/BpmnModeler";
import { Logger } from "./app/lib";

export function activate(context: vscode.ExtensionContext) {
    try {
        Logger.setOutputChannel("Miranum: Modeler");
        context.subscriptions.push(Logger.get());
        context.subscriptions.push(BpmnModeler.register(context));
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export function deactivate() {}
