import "reflect-metadata";
import { ExtensionContext } from "vscode";
import { container } from "tsyringe";

import { setContext } from "@miranum-ide/vscode/miranum-vscode";

import { config } from "./main.config";
import {
    VsCodeBpmnEditorAdapter,
    VsCodeDmnEditorAdapter,
    VsCodeOpenLoggingConsoleCommand,
    VsCodeToggleTextEditorCommand,
} from "./adapter/in";

export function activate(context: ExtensionContext) {
    // 1. Set the global application context
    setContext(context);

    // 2. Configure the application
    config();

    // 3. Register the commands
    // otherwise tsyringe won't create the instance
    container.resolve(VsCodeToggleTextEditorCommand);
    container.resolve(VsCodeOpenLoggingConsoleCommand);

    // 4. Start the application
    container.resolve(VsCodeBpmnEditorAdapter);
    container.resolve(VsCodeDmnEditorAdapter);
}
