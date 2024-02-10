import "reflect-metadata";
import {
    CancellationToken,
    CustomTextEditorProvider,
    Disposable,
    ExtensionContext,
    TextDocument,
    WebviewPanel,
    window,
} from "vscode";
import { setContext } from "@miranum-ide/vscode/miranum-vscode";
import {
    createMiranumWebview,
    MiranumModelerViewType,
    setMiranumWebviewPanel,
} from "./adapter/webview";
import { setDocument } from "./adapter/document";
import { configBpmnModeler, configDmnModeler } from "./main.config";

export function activate(context: ExtensionContext) {
    // 1. Set the global extension context
    const c = setContext(context);

    // 2. Register the commands

    // 3. Register CustomTextEditor
    c.subscriptions.push(MiranumModeler.register("miranum-bpmn-modeler"));
    c.subscriptions.push(MiranumModeler.register("miranum-dmn-modeler"));
}

class MiranumModeler implements CustomTextEditorProvider {
    private readonly viewType: MiranumModelerViewType;

    private constructor(viewType: MiranumModelerViewType) {
        this.viewType = viewType;

        if (this.viewType === "miranum-bpmn-modeler") {
            configBpmnModeler();
        } else if (this.viewType === "miranum-dmn-modeler") {
            configDmnModeler();
        }
    }

    public static register(viewType: MiranumModelerViewType): Disposable {
        const provider = new MiranumModeler(viewType);
        return window.registerCustomEditorProvider(viewType, provider);
    }

    resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): void | Thenable<void> {
        setDocument(document);
        const wp = createMiranumWebview(webviewPanel, this.viewType);

        webviewPanel.onDidChangeViewState((e) => {
            if (e.webviewPanel.active) {
                setDocument(document);
                setMiranumWebviewPanel(wp);
            }
        });
    }
}
