import "reflect-metadata";
import {
    CancellationToken,
    CustomTextEditorProvider,
    ExtensionContext,
    TextDocument,
    WebviewPanel,
    window,
} from "vscode";
import { container } from "tsyringe";

import {
    DocumentAdapter as InDocumentAdapter,
    WebviewAdapter as InWebviewAdapter,
} from "./adapter/adapterIn";
import {
    DocumentAdapter as OutDocumentAdapter,
    WebviewAdapter as OutWebviewAdapter,
} from "./adapter/adapterOut";

import { config } from "./main.config";
import { EXTENSION_CONTEXT } from "./common";

export async function activate(context: ExtensionContext) {
    await config();

    EXTENSION_CONTEXT.setContext(context);

    // CustomTextEditor
    const editor = window.registerCustomEditorProvider(
        "miranum.configEditor",
        new CustomTextEditor(),
    );

    EXTENSION_CONTEXT.getContext().subscriptions.push(editor);
}

class CustomTextEditor implements CustomTextEditorProvider {
    async resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): Promise<void> {
        this.initialSetup(webviewPanel, document);

        new InWebviewAdapter(
            webviewPanel.webview,
            document,
            container.resolve("InitWebviewInPort"),
            container.resolve("SyncDocumentInPort"),
        );

        new InDocumentAdapter(document, container.resolve("SyncWebviewInPort"));
    }

    private initialSetup(webviewPanel: WebviewPanel, document: TextDocument) {
        const webviewOutAdapter = container.resolve<OutWebviewAdapter>("WebviewOutPort");
        const documentOutAdapter =
            container.resolve<OutDocumentAdapter>("DocumentOutPort");

        webviewOutAdapter.updateActiveWebview(document.fileName, webviewPanel.webview);
        documentOutAdapter.updateActiveDocument(document);

        webviewPanel.onDidChangeViewState((event) => {
            if (event.webviewPanel.active) {
                webviewOutAdapter.updateActiveWebview(
                    document.fileName,
                    webviewPanel.webview,
                );
                documentOutAdapter.updateActiveDocument(document);
            }
        });
    }
}
