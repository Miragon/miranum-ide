import {
    CancellationToken,
    CustomTextEditorProvider,
    TextDocument,
    WebviewPanel,
} from "vscode";
import { createMiranumWebview, setMiranumWebviewPanel } from "../webview";
import { setDocument, setWorkspace } from "../workspace";
import { FilePathCommand } from "../../application/ports/in";

export class BpmnModelerAdapter implements CustomTextEditorProvider {
    private readonly viewType = "miranum-bpmn-modeler";

    resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): void | Thenable<void> {
        setWorkspace(new FilePathCommand(document.uri.path));
        setDocument(document);
        const wp = createMiranumWebview(webviewPanel, this.viewType);

        webviewPanel.onDidChangeViewState((e) => {
            if (e.webviewPanel.active) {
                setWorkspace(new FilePathCommand(document.uri.path));
                setDocument(document);
                setMiranumWebviewPanel(wp);
            }
        });
    }
}

export class DmnModelerAdapter implements CustomTextEditorProvider {
    private readonly viewType = "miranum-dmn-modeler";

    resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): void | Thenable<void> {
        setWorkspace(new FilePathCommand(document.uri.path));
        setDocument(document);
        const wp = createMiranumWebview(webviewPanel, this.viewType);

        webviewPanel.onDidChangeViewState((e) => {
            if (e.webviewPanel.active) {
                setWorkspace(new FilePathCommand(document.uri.path));
                setDocument(document);
                setMiranumWebviewPanel(wp);
            }
        });
    }
}
