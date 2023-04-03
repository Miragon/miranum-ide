import { ExtensionContext } from "vscode";
import { Logger } from "@miranum-ide/vscode/miranum-vscode";
import { BpmnModeler } from "./app/BpmnModeler";

export function activate(context: ExtensionContext) {
    try {
        context.subscriptions.push(Logger.get("Miranum: Modeler"));
        context.subscriptions.push(BpmnModeler.register(context));
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export function deactivate() {}
