import "reflect-metadata";
import { ExtensionContext, window } from "vscode";
import { container } from "tsyringe";

import { setContext } from "@miranum-ide/vscode/miranum-vscode";

import { config } from "./main.config";
import { BpmnModelerAdapter, DmnModelerAdapter } from "./adapter/in";

export function activate(context: ExtensionContext) {
    config();

    // 1. Set the global extension context
    const c = setContext(context);

    // 2. Register the commands

    // 3. Register CustomTextEditor
    const bpmnModeler = window.registerCustomEditorProvider(
        container.resolve("BpmnModelerViewType"),
        container.resolve(BpmnModelerAdapter),
    );
    const dmnModeler = window.registerCustomEditorProvider(
        container.resolve("DmnModelerViewType"),
        container.resolve(DmnModelerAdapter),
    );

    c.subscriptions.push(bpmnModeler, dmnModeler);
}
