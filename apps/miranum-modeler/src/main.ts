import {
    CancellationToken,
    CustomTextEditorProvider,
    ExtensionContext,
    TextDocument,
    WebviewPanel,
    window,
} from "vscode";
import { setContext } from "@miranum-ide/vscode/miranum-vscode";
import { setMiranumWebview } from "./adapter/webview";
import { setDocument } from "./adapter/document";

export function activate(context: ExtensionContext) {
    // 1. Configure the application

    // 2. Set the global extension context
    const c = setContext(context);

    // 3. Register the commands

    // 4. Register CustomTextEditor
    const customTextEditor = window.registerCustomEditorProvider(
        "miranum-modeler",
        new CustomTextEditor(),
    );
    c.subscriptions.push(customTextEditor);
}

export function deactivate() {}

class CustomTextEditor implements CustomTextEditorProvider {
    resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): void | Thenable<void> {
        setDocument(document);
        setMiranumWebview(webviewPanel, document.fileName.split(".").pop()!);
    }
}
