import {
    CancellationToken,
    CustomTextEditorProvider,
    TextDocument,
    TextDocumentChangeEvent,
    WebviewPanel,
    window,
} from "vscode";
import { container, inject, singleton } from "tsyringe";

import { getContext } from "@miranum-ide/vscode/miranum-vscode";
import {
    MiranumModelerCommand,
    SyncDocumentCommand,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    GetDocumentInPort,
    LogMessageInPort,
    SetBpmnModelerSettingsInPort,
    SetElementTemplatesInPort,
    SetFormKeysInPort,
    ShowMessageInPort,
    SyncDocumentInPort,
} from "../../application/ports/in";
import {
    createEditor,
    subscibeToEditorChangeEvent,
    subscribeToDisposeEvent,
    subscribeToDocumentChangeEvent,
    subscribeToMessageEvent,
    subscribeToSettingChangeEvent,
} from "../out";
import { VsCodeArtifactWatcherAdapter } from "./workspace";
import {
    blockChangeDocumentEvent,
    isChangeDocumentEventBlocked,
} from "../helper/vscode";

@singleton()
export class VsCodeBpmnEditorAdapter implements CustomTextEditorProvider {
    constructor(
        @inject("BpmnModelerViewType")
        private readonly viewType: string,
        @inject("DisplayBpmnModelerInPort")
        private readonly displayBpmnModelerInPort: DisplayBpmnModelerInPort,
        @inject("SetFormKeysInPort")
        private readonly setFormKeysInPort: SetFormKeysInPort,
        @inject("SetElementTemplatesInPort")
        private readonly setElementTemplatesInPort: SetElementTemplatesInPort,
        @inject("SetBpmnModelerSettingsInPort")
        private readonly setBpmnModelerSettingsInPort: SetBpmnModelerSettingsInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("GetDocumentInPort")
        private readonly getDocumentUseCase: GetDocumentInPort,
        @inject("ShowMessageInPort")
        private readonly showMessageInPort: ShowMessageInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
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
            createEditor(this.viewType, editorId, webviewPanel, document);

            // Subscribe to events
            this.subscribeToMessageEvent();
            this.subscribeToDocumentChangeEvent();
            this.subscribeToSettingChangeEvent();
            subscibeToEditorChangeEvent();
            subscribeToDisposeEvent();

            const errors = await this.artifactWatcherAdapter.create(editorId);
            for (const error of errors) {
                this.showMessageInPort.error(error.message);
                this.logMessageInPort.error(error);
            }
        } catch (error) {
            this.showMessageInPort.error((error as Error).message);
            this.logMessageInPort.error(error as Error);
        }
    }

    private subscribeToMessageEvent() {
        subscribeToMessageEvent(
            async (message: MiranumModelerCommand, editorId: string) => {
                switch (message.type) {
                    case "GetBpmnFileCommand": {
                        if (await this.displayBpmnModelerInPort.display(editorId)) {
                            this.logMessageInPort.info("Bpmn modeler is ready");
                        }
                        break;
                    }
                    case "GetFormKeysCommand": {
                        this.setFormKeysInPort.set(editorId);
                        break;
                    }
                    case "GetElementTemplatesCommand": {
                        this.setElementTemplatesInPort.set(editorId);
                        break;
                    }
                    case "GetBpmnModelerSettingCommand": {
                        this.setBpmnModelerSettingsInPort.set(editorId);
                        break;
                    }
                    case "SyncDocumentCommand": {
                        this.syncDocumentInPort.sync(
                            editorId,
                            (message as SyncDocumentCommand).content,
                        );
                        break;
                    }
                }
            },
        );
    }

    private subscribeToDocumentChangeEvent() {
        subscribeToDocumentChangeEvent((event: TextDocumentChangeEvent) => {
            const documentPath = this.getDocumentUseCase.getPath();
            if (
                event.contentChanges.length !== 0 &&
                documentPath.split(".").pop() === "bpmn" &&
                documentPath === event.document.uri.path &&
                !isChangeDocumentEventBlocked
            ) {
                this.displayBpmnModelerInPort.display(event.document.uri.path);
                blockChangeDocumentEvent(false);
            }
        });
    }

    private subscribeToSettingChangeEvent() {
        subscribeToSettingChangeEvent((event, editorId) => {
            if (event.affectsConfiguration("miranumIDE.modeler.alignToOrigin")) {
                this.setBpmnModelerSettingsInPort.set(editorId);
            }
        });
    }
}

@singleton()
export class VsCodeDmnEditorAdapter implements CustomTextEditorProvider {
    constructor(
        @inject("DmnModelerViewType")
        private readonly viewType: string,
        @inject("DisplayDmnModelerInPort")
        private readonly displayDmnModelerInPort: DisplayDmnModelerInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("GetDocumentInPort")
        private readonly getDocumentUseCase: GetDocumentInPort,
        @inject("SetBpmnModelerSettingsInPort")
        private readonly setBpmnModelerSettingsInPort: SetBpmnModelerSettingsInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
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
            createEditor(this.viewType, editorId, webviewPanel, document);

            this.subscribeToMessageEvent();
            this.subscribeToDocumentChangeEvent();
            this.subscribeToSettingChangeEvent();
            subscibeToEditorChangeEvent();
            subscribeToDisposeEvent();
        } catch (error) {
            this.logMessageInPort.error(error as Error);
        }
    }

    private subscribeToMessageEvent() {
        subscribeToMessageEvent(
            async (message: MiranumModelerCommand, editorId: string) => {
                switch (message.type) {
                    case "GetDmnFileCommand": {
                        if (await this.displayDmnModelerInPort.display(editorId)) {
                            this.logMessageInPort.info("Dmn modeler is ready");
                        }
                        break;
                    }
                    case "SyncDocumentCommand": {
                        this.syncDocumentInPort.sync(
                            editorId,
                            (message as SyncDocumentCommand).content,
                        );
                        break;
                    }
                }
            },
        );
    }

    private subscribeToDocumentChangeEvent() {
        subscribeToDocumentChangeEvent((event: TextDocumentChangeEvent) => {
            const documentPath = this.getDocumentUseCase.getPath();
            if (
                event.contentChanges.length !== 0 &&
                documentPath.split(".").pop() === "dmn" &&
                documentPath === event.document.uri.path &&
                !isChangeDocumentEventBlocked
            ) {
                this.displayDmnModelerInPort.display(event.document.uri.path);
                blockChangeDocumentEvent(false);
            }
        });
    }

    private subscribeToSettingChangeEvent() {
        subscribeToSettingChangeEvent((event, editorId) => {
            if (event.affectsConfiguration("miranumIDE.modeler.alignToOrigin")) {
                this.setBpmnModelerSettingsInPort.set(editorId);
            }
        });
    }
}
