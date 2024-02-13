import "reflect-metadata";
import { ExtensionContext, window } from "vscode";
import { setContext } from "@miranum-ide/vscode/miranum-vscode";
import { config } from "./main.config";
import { container } from "tsyringe";
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

    // c.subscriptions.push(MiranumModeler.register("miranum-bpmn-modeler"));
    // c.subscriptions.push(MiranumModeler.register("miranum-dmn-modeler"));
}

// class MiranumModeler implements CustomTextEditorProvider {
//     private readonly viewType: MiranumModelerViewType;
//
//     private constructor(viewType: MiranumModelerViewType) {
//         this.viewType = viewType;
//
//         if (this.viewType === "miranum-bpmn-modeler") {
//             configBpmnModeler();
//         } else if (this.viewType === "miranum-dmn-modeler") {
//             configDmnModeler();
//         }
//     }
//
//     public static register(viewType: MiranumModelerViewType): Disposable {
//         const provider = new MiranumModeler(viewType);
//         return window.registerCustomEditorProvider(viewType, provider);
//     }
//
//     resolveCustomTextEditor(
//         document: TextDocument,
//         webviewPanel: WebviewPanel,
//         token: CancellationToken,
//     ): void | Thenable<void> {
//         setWorkspace(new FilePathCommand(document.uri.path));
//         setDocument(document);
//         const wp = createMiranumWebview(webviewPanel, this.viewType);
//
//         webviewPanel.onDidChangeViewState((e) => {
//             if (e.webviewPanel.active) {
//                 setWorkspace(new FilePathCommand(document.uri.path));
//                 setDocument(document);
//                 setMiranumWebviewPanel(wp);
//             }
//         });
//     }
// }
