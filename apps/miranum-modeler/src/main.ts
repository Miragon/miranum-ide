import * as vscode from "vscode";
import { BpmnModeler } from "./app/BpmnModeler";
import { MiranumLogger } from "./app/lib";

export function activate(context: vscode.ExtensionContext) {
    MiranumLogger.LOGGER.clear();
    context.subscriptions.push(MiranumLogger.LOGGER);
    context.subscriptions.push(BpmnModeler.register(context));
}

export function deactivate() {}
