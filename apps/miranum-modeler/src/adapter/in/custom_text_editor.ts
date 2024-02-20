import {
    CancellationToken,
    CustomTextEditorProvider,
    TextDocument,
    WebviewPanel,
} from "vscode";
import { inject, singleton } from "tsyringe";

import {
    createMiranumWebview,
    setDocument,
    setMiranumWebviewPanel,
    setWorkspace,
} from "../helper/vscode";
import { FilePathCommand } from "../../application/ports/in";

@singleton()
export class BpmnModelerAdapter implements CustomTextEditorProvider {
    constructor(
        @inject("BpmnModelerViewType")
        private readonly viewType: string,
    ) {}

    resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): void | Thenable<void> {
        try {
            setWorkspace(new FilePathCommand(document.uri.path));
            setDocument(document);
            const wp = createMiranumWebview(
                document.uri.path,
                webviewPanel,
                this.viewType,
            );

            webviewPanel.onDidChangeViewState((e) => {
                if (e.webviewPanel.active) {
                    setWorkspace(new FilePathCommand(document.uri.path));
                    setDocument(document);
                    setMiranumWebviewPanel(document.uri.path, wp);
                }
            });
        } catch (error) {
            // TODO: Log the error
        }
    }
}

@singleton()
export class DmnModelerAdapter implements CustomTextEditorProvider {
    constructor(
        @inject("DmnModelerViewType")
        private readonly viewType: string,
    ) {}

    resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): void | Thenable<void> {
        try {
            setWorkspace(new FilePathCommand(document.uri.path));
            setDocument(document);
            const wp = createMiranumWebview(
                document.uri.path,
                webviewPanel,
                this.viewType,
            );

            webviewPanel.onDidChangeViewState((e) => {
                if (e.webviewPanel.active) {
                    setWorkspace(new FilePathCommand(document.uri.path));
                    setDocument(document);
                    setMiranumWebviewPanel(document.uri.path, wp);
                }
            });
        } catch (error) {
            // TODO: Log the error
        }
    }
}
