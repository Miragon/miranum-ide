/**
 * This module contains the CustomTextEditorProvider for `Miranum Forms`.
 * It handles the webview and synchronizes the webview with the data model and a preview.
 * @module JsonSchemaBuilderProvider
 */

import {
    CancellationToken,
    commands,
    CustomTextEditorProvider,
    Disposable,
    ExtensionContext,
    TextDocument,
    WebviewPanel,
    workspace,
} from "vscode";
import { Logger, ViewState } from "@miranum-ide/vscode/miranum-vscode";
import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-forms";
import { DocumentController } from "./controller";
import { PreviewComponent, TextEditorComponent } from "./components";
import { getHtmlForWebview, getMinimum } from "./utils";
import { MessageType, VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";

/**
 * The [Custom Text Editor](https://code.visualstudio.com/api/extension-guides/custom-editors) uses a ".form"-File as its
 * data model and synchronize changes with the [webview](https://code.visualstudio.com/api/extension-guides/webview).
 * The webview is build with [Vue.js](https://vuejs.org/) and uses the
 * [DigiWF Form Builder](https://github.com/FlowSquad/digiwf-core/tree/dev/digiwf-apps/packages/components/digiwf-form-builder).
 * The provider also register a [command](https://code.visualstudio.com/api/extension-guides/command) for toggling the
 * standard vscode text editor and a preview for rendering [Json Schema](https://json-schema.org/).
 */
export class JsonSchemaBuilderProvider implements CustomTextEditorProvider {
    /** Unique identifier for the custom editor provider. */
    public static readonly VIEWTYPE = "jsonschema-builder";

    /** Number of currently open custom text editors with the view type `jsonschema-builder`. */
    private static counter = 0;

    /** The controller ({@link DocumentController}) manages the document (.form-file). */
    private readonly controller: DocumentController<FormBuilderData>;

    /** The preview ({@link PreviewComponent}) renders the content of the active custom text editor. */
    private readonly preview: PreviewComponent;

    /** The text editor ({@link TextEditorComponent}) for direct changes inside the document. */
    private readonly textEditor: TextEditorComponent;

    /** An array with all disposables per webview panel. */
    private disposables: Map<string, Disposable[]> = new Map();

    /** @hidden Little helper to prevent the preview from closing after the text editor is opened. */
    private closePreview = true;

    /**
     * Register all components and controllers and set up all commands.
     * @param context The context of the extension
     */
    constructor(private readonly context: ExtensionContext) {
        Logger.get().clear();

        // initialize components
        this.textEditor = TextEditorComponent.getInstance();
        this.preview = new PreviewComponent(this.context.extensionUri);

        // initialize controller and subscribe the components to it
        this.controller = new DocumentController<FormBuilderData>();
        this.controller.subscribe(this.preview, this.textEditor);

        // ----- Register commands ---->
        const toggleTextEditor = commands.registerCommand(
            `${JsonSchemaBuilderProvider.VIEWTYPE}.toggleTextEditor`,
            () => {
                if (!this.textEditor.isOpen) {
                    this.closePreview = false;
                }
                this.textEditor.toggle(this.controller.document);
            },
        );
        const togglePreview = commands.registerCommand(
            `${JsonSchemaBuilderProvider.VIEWTYPE}.togglePreview`,
            () => {
                this.preview.toggle(this.controller);
            },
        );
        const toggleLogger = commands.registerCommand(
            `${JsonSchemaBuilderProvider.VIEWTYPE}.toggleLogger`,
            () => {
                if (!Logger.isOpen) {
                    Logger.show();
                } else {
                    Logger.hide();
                }
            },
        );

        this.context.subscriptions.push(togglePreview, toggleTextEditor, toggleLogger);
        // <---- Register commands -----
    }

    /**
     * Called when a new custom editor is opened.
     * @param document Represents the data model (.form-file)
     * @param webviewPanel The panel which contains the webview
     * @param token A cancellation token that indicates that the result is no longer needed
     */
    public async resolveCustomTextEditor(
        document: TextDocument,
        webviewPanel: WebviewPanel,
        token: CancellationToken,
    ): Promise<void> {
        // Disable preview mode
        await commands.executeCommand("workbench.action.keepEditor");

        const disposables: Disposable[] = [];
        let isUpdateFromWebview = false;
        let isBuffer = false;

        await this.init(document);

        // Setup webview
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = getHtmlForWebview(
            webviewPanel.webview,
            this.context.extensionUri,
            JsonSchemaBuilderProvider.VIEWTYPE,
        );

        // Send content from the extension to the webview
        // todo: change signature to (message: VscMessage)
        const postMessage = async (msgType: MessageType) => {
            //if (webviewPanel.visible) {
            let data: FormBuilderData | undefined;
            switch (msgType) {
                case MessageType.RESTORE: {
                    data = isBuffer ? this.controller.content : undefined;
                    break;
                }
                default: {
                    data = this.controller.content;
                    break;
                }
            }

            try {
                if (
                    await webviewPanel.webview.postMessage({
                        type: `${JsonSchemaBuilderProvider.VIEWTYPE}.${msgType}`,
                        data,
                    })
                ) {
                    if (msgType === MessageType.RESTORE) {
                        isBuffer = false;
                    }
                } else {
                    Logger.error(
                        "[Miranum.JsonSchema]",
                        `(Webview: ${webviewPanel.title})`,
                        `Could not post message (Viewtype: ${webviewPanel.visible})`,
                    );
                }
            } catch (error) {
                if (!document.isClosed) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : `Could not post message to ${webviewPanel}`;
                    Logger.error(
                        "[Miranum.JsonSchema]",
                        `(Webview: ${webviewPanel.title})`,
                        message,
                    );
                }
            }
            //}
        };

        // Receive messages from the webview
        webviewPanel.webview.onDidReceiveMessage(
            async (event: VscMessage<FormBuilderData>) => {
                try {
                    switch (event.type) {
                        case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.INITIALIZE}`: {
                            Logger.info(
                                "[Miranum.JsonSchema.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            postMessage(MessageType.INITIALIZE);
                            break;
                        }
                        case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.RESTORE}`: {
                            Logger.info(
                                "[Miranum.JsonSchema.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            postMessage(MessageType.RESTORE);
                            break;
                        }
                        case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.UPDATEFROMWEBVIEW}`: {
                            isUpdateFromWebview = true;
                            if (event.data) {
                                await this.controller.writeToDocument(event.data);
                            }
                            break;
                        }
                        case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.INFO}`: {
                            Logger.info(
                                "[Miranum.JsonSchema.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            break;
                        }
                        case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.ERROR}`: {
                            Logger.error(
                                "[Miranum.JsonSchema.Webview]",
                                `(Webview: ${webviewPanel.title})`,
                                event.message ?? "",
                            );
                            break;
                        }
                    }
                } catch (error) {
                    isUpdateFromWebview = false;
                    const message = error instanceof Error ? error.message : `${error}`;
                    Logger.error(
                        "[Miranum.JsonSchema]",
                        `(Webview: ${webviewPanel.title})`,
                        message,
                    );
                }
            },
            null,
            disposables,
        );

        /**
         * When changes are made inside the webview a message to the extension will be sent with the new data.
         * This will also change the model (= document). If the model is changed the onDidChangeTextDocument event
         * will trigger and the SAME data would be sent back to the webview.
         * To prevent this we check from where the changes came from (webview or somewhere else).
         * If the changes are made inside the webview (this.isUpdateFromWebview === true) then we will send NO data
         * to the webview. For example if the changes are made inside a separate editor then the data will be sent to
         * the webview to synchronize it with the current content of the model.
         */
        workspace.onDidChangeTextDocument(
            (e) => {
                if (
                    e.document.uri.toString() === document.uri.toString() &&
                    e.contentChanges.length !== 0 &&
                    !isUpdateFromWebview
                ) {
                    if (!e.document.getText()) {
                        // e.g. when user deletes all lines in text editor
                        this.controller.writeToDocument(getMinimum<FormBuilderData>());
                    }

                    // If the webview is in the background then no messages can be sent to it.
                    // So we have to remember that we need to update its content the next time the webview regain its focus.
                    if (!webviewPanel.visible) {
                        isBuffer = true;
                        return;
                    }

                    // Update the webviews content.
                    switch (e.reason) {
                        case 1: {
                            // Undo
                            postMessage(MessageType.UNDO);
                            break;
                        }
                        case 2: {
                            // Redo
                            postMessage(MessageType.REDO);
                            break;
                        }
                        case undefined: {
                            postMessage(MessageType.UPDATEFROMEXTENSION);
                            break;
                        }
                    }
                }
                isUpdateFromWebview = false; // reset
            },
            null,
            disposables,
        );

        // Called when the view state changes (e.g. user switch the tab)
        webviewPanel.onDidChangeViewState(
            (wp) => {
                try {
                    switch (true) {
                        /* ------- Panel is active/visible ------- */
                        case webviewPanel.active: {
                            this.controller.document = document;
                            if (
                                !this.preview.isOpen &&
                                this.preview.lastViewState === ViewState.OPEN
                            ) {
                                this.preview.open(this.controller);
                            }
                            // break omitted
                        }
                        /* ------- Panel is NOT active/visible ------- */
                        case !webviewPanel.active: {
                            if (!this.preview.active && this.closePreview) {
                                this.preview.close();
                            }
                            this.closePreview = true; // reset
                            // break omitted
                        }
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : `${error}`;
                    Logger.error(
                        "[Miranum.JsonSchema]",
                        `(Webview: ${wp.webviewPanel.title})`,
                        message,
                    );
                }
            },
            null,
            disposables,
        );

        // CleanUp after Custom Editor was closed.
        webviewPanel.onDidDispose(() => {
            JsonSchemaBuilderProvider.counter--;
            commands.executeCommand(
                "setContext",
                `${JsonSchemaBuilderProvider.VIEWTYPE}.openCustomEditors`,
                JsonSchemaBuilderProvider.counter,
            );

            this.textEditor.close(this.controller.document.fileName);
            this.preview.close();

            this.dispose(document.uri.toString());
            webviewPanel.dispose();
        }, webviewPanel.title);

        this.disposables.set(document.uri.toString(), disposables);
    }

    /** @hidden */
    private async init(document: TextDocument) {
        // Necessary set up for toggle command
        // only enable the command if a custom editor is open
        JsonSchemaBuilderProvider.counter++;
        commands.executeCommand(
            "setContext",
            `${JsonSchemaBuilderProvider.VIEWTYPE}.openCustomEditors`,
            JsonSchemaBuilderProvider.counter,
        );

        // set the document
        try {
            await this.controller.setInitialDocument(document);

            // if we open a second editor beside one with an open preview window we have to close it and create a new one.
            if (this.preview.isOpen) {
                this.preview.close();
            }
            this.preview.open(this.controller);
        } catch (error) {
            const message = error instanceof Error ? error.message : `${error}`;
            Logger.error("[Miranum.JsonSchema]", `(${document.fileName})`, message);
        }
    }

    /** @hidden */
    private dispose(key: string): void {
        let disposables = this.disposables.get(key);
        if (disposables) {
            this.disposables.delete(key);
        } else {
            disposables = [];
        }

        while (disposables.length) {
            const item = disposables.pop();
            if (item) {
                item.dispose();
            }
        }
    }
}
