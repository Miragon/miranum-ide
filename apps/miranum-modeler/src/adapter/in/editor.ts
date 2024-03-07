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
    DisplayModelerInPort,
    GetDocumentInPort,
    LogMessageInPort,
    SetArtifactInPort,
    SetModelerSettingInPort,
    ShowMessageInPort,
    SyncDocumentInPort,
} from "../../application/ports/in";
import {
    createEditor,
    subscribeToDisposeEvent,
    subscribeToDocumentChangeEvent,
    subscribeToMessageEvent,
    subscribeToSettingChangeEvent,
    subscribeToTabChangeEvent,
} from "../out";
import { VsCodeArtifactWatcherAdapter } from "./workspace";

abstract class VsCodeCustomEditor {
    protected abstract readonly extension: string;

    protected abstract readonly displayModelerInPort: DisplayModelerInPort;

    protected abstract readonly getDocumentUseCase: GetDocumentInPort;

    protected isChangeDocumentEventBlocked = false;

    protected abstract subscribeToMessageEvent(): void;

    protected subscribeToDocumentChangeEvent() {
        subscribeToDocumentChangeEvent((event: TextDocumentChangeEvent) => {
            const documentPath = this.getDocumentUseCase.getPath();
            console.debug("OnDidChangeTextDocument -> trigger");
            if (
                event.contentChanges.length !== 0 &&
                documentPath.split(".").pop() === this.extension &&
                documentPath === event.document.uri.path &&
                !this.isChangeDocumentEventBlocked
            ) {
                console.debug("OnDidChangeTextDocument -> send");
                this.displayModelerInPort.display(event.document.uri.path);
            }
        });
    }

    protected subscribeToTabChangeEvent() {
        subscribeToTabChangeEvent();
    }

    protected subscribeToDisposeEvent() {
        subscribeToDisposeEvent();
    }
}

@singleton()
export class VsCodeBpmnEditorAdapter
    extends VsCodeCustomEditor
    implements CustomTextEditorProvider
{
    protected extension = "bpmn";

    constructor(
        @inject("BpmnModelerViewType")
        private readonly viewType: string,
        @inject("DisplayBpmnModelerInPort")
        protected readonly displayModelerInPort: DisplayModelerInPort,
        @inject("SetFormKeysInPort")
        private readonly setFormKeysInPort: SetArtifactInPort,
        @inject("SetElementTemplatesInPort")
        private readonly setElementTemplatesInPort: SetArtifactInPort,
        @inject("SetBpmnModelerSettingsInPort")
        private readonly setBpmnModelerSettingsInPort: SetModelerSettingInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("GetDocumentInPort")
        protected readonly getDocumentUseCase: GetDocumentInPort,
        @inject("ShowMessageInPort")
        private readonly showMessageInPort: ShowMessageInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
        private readonly artifactWatcherAdapter: VsCodeArtifactWatcherAdapter,
    ) {
        super();
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
            this.subscribeToTabChangeEvent();
            this.subscribeToDisposeEvent();

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

    protected subscribeToMessageEvent() {
        subscribeToMessageEvent(
            async (message: MiranumModelerCommand, editorId: string) => {
                console.debug(
                    `[${new Date(
                        Date.now(),
                    ).toJSON()}] Message received -> ${message.type}`,
                );
                switch (message.type) {
                    case "GetBpmnFileCommand": {
                        if (await this.displayModelerInPort.display(editorId)) {
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
                        this.isChangeDocumentEventBlocked = true;
                        console.debug("SyncDocumentCommand -> blocked");
                        await this.syncDocumentInPort.sync(
                            editorId,
                            (message as SyncDocumentCommand).content,
                        );
                        this.isChangeDocumentEventBlocked = false;
                        console.debug("SyncDocumentCommand -> released");
                        break;
                    }
                }
                console.debug(
                    `[${new Date(
                        Date.now(),
                    ).toJSON()}] Message processed -> ${message.type}`,
                );
            },
        );
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
export class VsCodeDmnEditorAdapter
    extends VsCodeCustomEditor
    implements CustomTextEditorProvider
{
    protected extension = "dmn";

    constructor(
        @inject("DmnModelerViewType")
        private readonly viewType: string,
        @inject("DisplayDmnModelerInPort")
        protected readonly displayModelerInPort: DisplayModelerInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("GetDocumentInPort")
        protected readonly getDocumentUseCase: GetDocumentInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
    ) {
        super();
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
            this.subscribeToTabChangeEvent();
            this.subscribeToDisposeEvent();
        } catch (error) {
            this.logMessageInPort.error(error as Error);
        }
    }

    protected subscribeToMessageEvent() {
        subscribeToMessageEvent(
            async (message: MiranumModelerCommand, editorId: string) => {
                console.debug(
                    `[${new Date(
                        Date.now(),
                    ).toJSON()}] Message received -> ${message.type}`,
                );
                switch (message.type) {
                    case "GetDmnFileCommand": {
                        if (await this.displayModelerInPort.display(editorId)) {
                            this.logMessageInPort.info("Dmn modeler is ready");
                        }
                        break;
                    }
                    case "SyncDocumentCommand": {
                        this.isChangeDocumentEventBlocked = true;
                        console.debug("SyncDocumentCommand -> blocked");
                        await this.syncDocumentInPort.sync(
                            editorId,
                            (message as SyncDocumentCommand).content,
                        );
                        this.isChangeDocumentEventBlocked = false;
                        console.debug("SyncDocumentCommand -> released");
                        break;
                    }
                }
                console.debug(
                    `[${new Date(
                        Date.now(),
                    ).toJSON()}] Message processed -> ${message.type}`,
                );
            },
        );
    }
}
