import * as vscode from "vscode";
import { BpmnModeler } from "./app/BpmnModeler";
import { Logger } from "./app/lib";
import { DmnModeler } from "./app/DmnModeler";

export function activate(context: vscode.ExtensionContext) {
    try {
        context.subscriptions.push(Logger.get("Miranum: Modeler"));
        context.subscriptions.push(BpmnModeler.register(context));
        context.subscriptions.push(DmnModeler.register(context));
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export function deactivate() {}
