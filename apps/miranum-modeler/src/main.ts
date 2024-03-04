import "reflect-metadata";
import { ExtensionContext } from "vscode";
import { container } from "tsyringe";

import { setContext } from "@miranum-ide/vscode/miranum-vscode";

import { config } from "./main.config";
import { VsCodeBpmnModelerAdapter, VsCodeDmnModelerAdapter } from "./adapter/in";

export function activate(context: ExtensionContext) {
    // 1. Set the global extension context
    setContext(context);

    // 2. Configure the extension
    config();

    // 3. Start the application
    container.resolve(VsCodeBpmnModelerAdapter); // otherwise tsyringe won't create the instance
    container.resolve(VsCodeDmnModelerAdapter);
}
