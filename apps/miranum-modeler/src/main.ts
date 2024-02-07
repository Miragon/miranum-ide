import { ExtensionContext } from "vscode";
import { setContext } from "@miranum-ide/vscode/miranum-vscode";

export function activate(context: ExtensionContext) {
    // 1. Configure the application

    // 2. Set the context
    const c = setContext(context);

    // 3. Register the commands

    // 4. Register CustomTextEditor
}

export function deactivate() {}
