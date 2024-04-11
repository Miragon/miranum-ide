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
    DisplayFormBuilderInPort,
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
    ) {
        this.create();
    }

    toggle(): boolean {
        try {
            if (this.panel?.visible) {
                this.panel.dispose();
            } else {
                this.create();
            }
        } catch (error) {
            if ((error as Error).message === "Webview is disposed") {
                this.create();
            }
        }
        return true;
    }

    private create() {
        this.panel = createPreview(this.viewType);

        this.subscribeToMessageEvent();
        this.subscribeToSettingChangeEvent();

        this.panel.onDidDispose(() => {
            this.disposables.forEach((disposable) => disposable.dispose());
        });
    }

    private subscribeToMessageEvent() {
        this.panel?.webview.onDidReceiveMessage(async (message: Command) => {
            console.debug(
                `[${new Date(Date.now()).toJSON()}] (Preview) Message received -> ${message.type}`,
            );
            switch (message.type) {
                case "GetJsonFormCommand": {
                    this.displayFormPreviewInPort.display();
                    break;
                }
                case "LogInfoCommand": {
                    this.logMessageInPort.info((message as LogInfoCommand).message);
                    break;
                }
                case "LogErrorCommand": {
                    this.logMessageInPort.error(
                        new Error((message as LogErrorCommand).message),
                    );
                    break;
                }
            }
            console.debug(
                `[${new Date(Date.now()).toJSON()}] (Preview) Message processed -> ${
                    message.type
                }`,
            );
        });
    }

    private subscribeToSettingChangeEvent() {
        workspace.onDidChangeConfiguration(
            (event) => {
                if (event.affectsConfiguration("miranumIDE.jsonforms.renderer")) {
                    this.setSettingInPort.setSetting();
                }
            },
            null,
            this.disposables,
        );
    }
}

@singleton()
export class VsCodeFormBuilderAdapter implements CustomTextEditorProvider {
    private readonly extension = "form.json";

    private isChangeDocumentEventBlocked = false;

    constructor(
        @inject("FormBuilderViewType")
        private readonly viewType: string,
        @inject("DisplayFormBuilderInPort")
        protected readonly displayFormBuilderInPort: DisplayFormBuilderInPort,
        @inject("DisplayFormPreviewInPort")
        protected readonly displayFormPreviewInPort: DisplayFormPreviewInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("GetDocumentInPort")
        protected readonly getDocumentUseCase: GetDocumentInPort,
        @inject("DisplayMessageInPort")
        private readonly displayMessageInPort: DisplayMessageInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
    ) {
        const formBuilder = window.registerCustomEditorProvider(
            container.resolve("FormBuilderViewType"),
            this,
        );

        getContext().subscriptions.push(formBuilder);
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
            this.subscribeToTabChangeEvent();
            this.subscribeToDisposeEvent();
        } catch (error) {
            this.displayMessageInPort.error((error as Error).message);
            this.logMessageInPort.error(error as Error);
        }
    }

    protected subscribeToMessageEvent() {
        subscribeToMessageEvent(async (message: Command, editorId: string) => {
            console.debug(
                `[${new Date(Date.now()).toJSON()}] (Builder) Message received -> ${message.type}`,
            );
            switch (message.type) {
                case "GetJsonFormCommand": {
                    this.displayFormBuilderInPort.display(editorId);
                    break;
                }
                case "SyncDocumentCommand": {
                    this.isChangeDocumentEventBlocked = true;
                    console.debug("(Builder) SyncDocumentCommand -> blocked");
                    await this.syncDocumentInPort.sync(
                        editorId,
                        (message as SyncDocumentCommand).content,
                    );
                    this.isChangeDocumentEventBlocked = false;
                    console.debug("(Builder) SyncDocumentCommand -> released");
                    break;
                }
                case "LogInfoCommand": {
                    this.logMessageInPort.info((message as LogInfoCommand).message);
                    break;
                }
                case "LogErrorCommand": {
                    this.logMessageInPort.error(
                        new Error((message as LogErrorCommand).message),
                    );
                    break;
                }
            }
            console.debug(
                `[${new Date(Date.now()).toJSON()}] (Builder) Message processed -> ${
                    message.type
                }`,
            );
        });
    }

    protected subscribeToDocumentChangeEvent() {
        subscribeToDocumentChangeEvent((event: TextDocumentChangeEvent) => {
            const documentPath = this.getDocumentUseCase.getPath();
            console.debug("(Builder) OnDidChangeTextDocument -> trigger");
            this.displayFormPreviewInPort.display();
            if (
                event.contentChanges.length !== 0 &&
                documentPath.substring(documentPath.indexOf(".") + 1) ===
                    this.extension &&
                documentPath === event.document.uri.path &&
                !this.isChangeDocumentEventBlocked
            ) {
                console.debug("(Builder) OnDidChangeTextDocument -> send");
                this.displayFormBuilderInPort.display(event.document.uri.path);
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
