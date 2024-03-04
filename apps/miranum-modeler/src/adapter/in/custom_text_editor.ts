import {
    CancellationToken,
    CustomTextEditorProvider,
    TextDocument,
    WebviewPanel,
    window,
} from "vscode";
import { container, inject, singleton } from "tsyringe";

import { getContext } from "@miranum-ide/vscode/miranum-vscode";

import { LogMessageInPort, ShowMessageInPort } from "../../application/ports/in";
import { createEditor, setActiveEditor } from "../out";
import { VsCodeBpmnWebviewAdapter, VsCodeDmnWebviewAdapter } from "./webview";
import {
    VsCodeArtifactWatcherAdapter,
    VsCodeBpmnDocumentAdapter,
    VsCodeDmnDocumentAdapter,
} from "./workspace";

@singleton()
export class VsCodeBpmnModelerAdapter implements CustomTextEditorProvider {
    constructor(
        @inject("BpmnModelerViewType")
        private readonly viewType: string,
        @inject("ShowMessageInPort")
        private readonly showMessageInPort: ShowMessageInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
        private readonly bpmnWebviewAdapter: VsCodeBpmnWebviewAdapter,
        private readonly bpmnDocumentAdapter: VsCodeBpmnDocumentAdapter,
        private readonly artifactWatcherAdapter: VsCodeArtifactWatcherAdapter,
    ) {
        const bpmnModeler = window.registerCustomEditorProvider(
            container.resolve("BpmnModelerViewType"),
            this,
        );

        getContext().subscriptions.push(bpmnModeler);
    }

    async resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): Promise<void> {
        try {
            const editorId = document.uri.path;
            const wp = createEditor(this.viewType, editorId, webviewPanel, document);
            this.bpmnWebviewAdapter.register();
            this.bpmnDocumentAdapter.register();
            const errors = await this.artifactWatcherAdapter.create(editorId);

            for (const error of errors) {
                this.showMessageInPort.error(error.message);
                this.logMessageInPort.error(error);
            }

            webviewPanel.onDidChangeViewState((e) => {
                // if the user switches from one webview to another
                if (e.webviewPanel.active) {
                    setActiveEditor(editorId, wp, document);
                }
            });
        } catch (error) {
            this.showMessageInPort.error((error as Error).message);
            this.logMessageInPort.error(error as Error);
        }
    }
}

@singleton()
export class VsCodeDmnModelerAdapter implements CustomTextEditorProvider {
    constructor(
        @inject("DmnModelerViewType")
        private readonly viewType: string,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
        private readonly dmnWebviewAdapter: VsCodeDmnWebviewAdapter,
        private readonly dmnDocumentAdapter: VsCodeDmnDocumentAdapter,
    ) {
        const dmnModeler = window.registerCustomEditorProvider(
            container.resolve("DmnModelerViewType"),
            this,
        );

        getContext().subscriptions.push(dmnModeler);
    }

    resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): void | Thenable<void> {
        try {
            const editorId = document.uri.path;
            const wp = createEditor(this.viewType, editorId, webviewPanel, document);
            this.dmnWebviewAdapter.register();
            this.dmnDocumentAdapter.register();

            webviewPanel.onDidChangeViewState((e) => {
                if (e.webviewPanel.active) {
                    setActiveEditor(editorId, wp, document);
                }
            });
        } catch (error) {
            this.logMessageInPort.error(error as Error);
        }
    }
}
