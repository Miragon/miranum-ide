import * as vscode from "vscode";
import { BpmnModeler } from "./app/BpmnModeler";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(BpmnModeler.register(context));
}

export function deactivate() {}
