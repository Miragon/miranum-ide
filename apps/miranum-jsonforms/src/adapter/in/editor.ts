import {
    CancellationToken,
    CustomTextEditorProvider,
    Disposable,
    TextDocument,
    TextDocumentChangeEvent,
    WebviewPanel,
    window,
    workspace,
} from "vscode";
import { container, inject, singleton } from "tsyringe";

import { getContext } from "@miranum-ide/vscode/miranum-vscode";
import {
    Command,
    LogErrorCommand,
    LogInfoCommand,
    SyncDocumentCommand,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import {
    DisplayFormEditorInPort,
    DisplayFormPreviewInPort,
    DisplayMessageInPort,
    GetDocumentInPort,
    LogMessageInPort,
    SetSettingInPort,
    SyncDocumentInPort,
} from "../../application/ports/in";
import {
    createEditor,
    createPreview,
    subscribeToDisposeEvent,
    subscribeToDocumentChangeEvent,
    subscribeToMessageEvent,
    subscribeToTabChangeEvent,
} from "../out";

@singleton()
export class VsCodeFormPreviewAdapter {
    private panel?: WebviewPanel;

    private readonly disposables: Disposable[] = [];

    constructor(
        @inject("FormPreviewViewType")
        private readonly viewType: string,
        @inject("SetSettingInPort")
        private readonly setSettingInPort: SetSettingInPort,
        @inject("DisplayFormPreviewInPort")
        private readonly displayFormPreviewInPort: DisplayFormPreviewInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
    ) {}

    async toggle(): Promise<boolean> {
        try {
            if (this.panel?.visible) {
                this.panel.dispose();
            } else {
                await this.create();
            }
        } catch (error) {
            if ((error as Error).message === "Webview is disposed") {
                await this.create();
            }
        }
        return true;
    }

    async create() {
        if (this.panel) {
            this.logMessageInPort.info("(Preview) The preview is already open.");
            return;
        }

        try {
            this.panel = createPreview(this.viewType);

            this.subscribeToMessageEvent();
            this.subscribeToSettingChangeEvent();

            this.panel.onDidDispose(() => {
                this.disposables.forEach((disposable) => disposable.dispose());
                this.panel = undefined;
            });

            await Promise.all([
                this.setSettingInPort.setSetting(),
                this.displayFormPreviewInPort.display(),
            ]);
        } catch (error) {
            this.logMessageInPort.error(error as Error);
        }
    }

    private subscribeToMessageEvent() {
        this.panel?.webview.onDidReceiveMessage(async (message: Command) => {
            try {
                console.debug(
                    `[${new Date(Date.now()).toJSON()}] (Preview) Message received -> ${message.type}`,
                );
                switch (message.type) {
                    case "GetJsonFormCommand": {
                        await this.displayFormPreviewInPort.display();
                        break;
                    }
                    case "GetSettingCommand": {
                        await this.setSettingInPort.setSetting();
                        break;
                    }
                    case "LogInfoCommand": {
                        this.logMessageInPort.info(
                            `(Preview) ${(message as LogInfoCommand).message}`,
                        );
                        break;
                    }
                    case "LogErrorCommand": {
                        this.logMessageInPort.error(
                            new Error(
                                `(Preview) ${(message as LogErrorCommand).message}`,
                            ),
                        );
                        break;
                    }
                }
                console.debug(
                    `[${new Date(Date.now()).toJSON()}] (Preview) Message processed -> ${
                        message.type
                    }`,
                );
            } catch (error) {
                this.logMessageInPort.error(error as Error);
            }
        });
    }

    private subscribeToSettingChangeEvent() {
        workspace.onDidChangeConfiguration(
            async (event) => {
                try {
                    if (event.affectsConfiguration("miranumIDE.jsonforms.renderer")) {
                        await this.setSettingInPort.setSetting();
                    }
                } catch (error) {
                    this.logMessageInPort.error(error as Error);
                }
            },
            null,
            this.disposables,
        );
    }
}

@singleton()
export class VsCodeFormEditorAdapter implements CustomTextEditorProvider {
    private readonly extension = "form.json";

    private isChangeDocumentEventBlocked = false;

    constructor(
        @inject("FormEditorViewType")
        private readonly viewType: string,
        @inject("DisplayFormEditorInPort")
        protected readonly displayFormEditorInPort: DisplayFormEditorInPort,
        @inject("DisplayFormPreviewInPort")
        private readonly displayFormPreviewInPort: DisplayFormPreviewInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("GetDocumentInPort")
        protected readonly getDocumentUseCase: GetDocumentInPort,
        @inject("DisplayMessageInPort")
        private readonly displayMessageInPort: DisplayMessageInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
        private readonly formPreviewAdapter: VsCodeFormPreviewAdapter,
    ) {
        const formEditor = window.registerCustomEditorProvider(
            container.resolve("FormEditorViewType"),
            this,
        );

        getContext().subscriptions.push(formEditor);
    }

    async resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): Promise<void> {
        try {
            const editorId = document.uri.path;
            createEditor(this.viewType, editorId, webviewPanel, document);
            await this.formPreviewAdapter.create();

            // Subscribe to events
            this.subscribeToMessageEvent();
            this.subscribeToDocumentChangeEvent();
            this.subscribeToTabChangeEvent();
            this.subscribeToDisposeEvent();
        } catch (error) {
            const e = error as Error;
            this.displayMessageInPort.error(e.message);
            this.logMessageInPort.error(e);
        }
    }

    protected subscribeToMessageEvent() {
        subscribeToMessageEvent(async (message: Command, editorId: string) => {
            try {
                console.debug(
                    `[${new Date(Date.now()).toJSON()}] (Editor) Message received -> ${message.type}`,
                );
                switch (message.type) {
                    case "GetJsonFormCommand": {
                        await this.displayFormEditorInPort.display(editorId);
                        break;
                    }
                    case "SyncDocumentCommand": {
                        this.isChangeDocumentEventBlocked = true;
                        console.debug("(Editor) SyncDocumentCommand -> blocked");
                        const json = JSON.stringify(
                            JSON.parse((message as SyncDocumentCommand).content),
                            null,
                            4,
                        );
                        await this.syncDocumentInPort.sync(editorId, json);
                        break;
                    }
                    case "LogInfoCommand": {
                        this.logMessageInPort.info(
                            `(Editor) ${(message as LogInfoCommand).message}`,
                        );
                        break;
                    }
                    case "LogErrorCommand": {
                        this.logMessageInPort.error(
                            new Error(
                                `(Editor) ${(message as LogErrorCommand).message}`,
                            ),
                        );
                        break;
                    }
                }
                console.debug(
                    `[${new Date(Date.now()).toJSON()}] (Editor) Message processed -> ${
                        message.type
                    }`,
                );
            } catch (error) {
                this.logMessageInPort.error(error as Error);
            }
        });
    }

    protected subscribeToDocumentChangeEvent() {
        subscribeToDocumentChangeEvent(async (event: TextDocumentChangeEvent) => {
            const documentPath = this.getDocumentUseCase.getPath();
            console.debug("(Editor) OnDidChangeTextDocument -> trigger");
            try {
                if (
                    event.contentChanges.length !== 0 &&
                    event.document.uri.path === documentPath &&
                    documentPath.substring(documentPath.indexOf(".") + 1) ===
                        this.extension
                ) {
                    if (!this.isChangeDocumentEventBlocked) {
                        console.debug("(Editor) OnDidChangeTextDocument -> send");
                        await this.displayFormEditorInPort.display(
                            event.document.uri.path,
                        );
                    }

                    await this.displayFormPreviewInPort.display();
                }

                this.isChangeDocumentEventBlocked = false;
                console.debug("(Editor) SyncDocumentCommand -> released");
            } catch (error) {
                this.logMessageInPort.error(new Error((error as Error).message));
                return;
            }
        });
    }

    protected subscribeToTabChangeEvent() {
        subscribeToTabChangeEvent(() => this.displayFormPreviewInPort.display());
    }

    protected subscribeToDisposeEvent() {
        subscribeToDisposeEvent();
    }
}
