/**
 * This module contains the PreviewComponent for `Miranum Forms`.
 * It handles a webview that renders the json schema.
 * @module PreviewComponent
 */

import { Disposable, Uri, Webview, WebviewPanel, workspace } from "vscode";
import {
    CloseCaller,
    DocumentManager,
    Logger,
    Preview,
    ViewState,
    WebviewOptions,
} from "@miranum-ide/vscode/miranum-vscode";
import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-forms";
import { getHtmlForWebview } from "../utils";
import { MessageType, VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";

export class PreviewComponent extends Preview<DocumentManager<FormBuilderData>> {
    /** Unique identifier for the preview. */
    public readonly viewType = "jsonschema-renderer";

    /** Object that contains information for the webview. */
    protected readonly webviewOptions: WebviewOptions = {
        title: "JsonSchema Renderer",
        icon: Uri.joinPath(this.extensionUri, "resources/logo_blau.png"),
    };

    constructor(protected readonly extensionUri: Uri) {
        super();
        Logger.info("[Miranum.JsonSchema.Preview]", "Preview was created.");
    }

    public async update(message: VscMessage<FormBuilderData>) {
        try {
            if (await this.webview.postMessage(message)) {
                this.isBuffer = false;
            } else {
                this.isBuffer = true;
                throw Error(`Couldn't update preview. (ViewState: ${this.visible})`);
            }
        } catch (error) {
            this.isBuffer = true;
            throw error;
        }
    }

    /**
     * Returns the html content that is rendered inside the webview.
     * @param webview The webview.
     * @param extensionUri The URI of the extension.
     * @protected
     */
    protected getHtml(webview: Webview, extensionUri: Uri): string {
        return getHtmlForWebview(webview, extensionUri, this.viewType);
    }

    protected setEventHandlers(
        webviewPanel: WebviewPanel,
        document: DocumentManager<FormBuilderData>,
    ): Disposable[] {
        const disposables: Disposable[] = [];

        workspace.onDidChangeTextDocument(async (event) => {
            if (
                event.document.uri.toString() === document.document.uri.toString() &&
                event.contentChanges.length !== 0
            ) {
                try {
                    await this.update({
                        type: `${this.viewType}.${MessageType.UPDATEFROMEXTENSION}`,
                        data: document.content,
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : `${error}`;
                    Logger.error(
                        "[Miranum.JsonSchema.Preview]",
                        `(Webview: ${webviewPanel.title})`,
                        message,
                    );
                }
            }
        });

        webviewPanel.webview.onDidReceiveMessage(
            async (msg: VscMessage<FormBuilderData>) => {
                try {
                    switch (msg.type) {
                        case `${this.viewType}.${MessageType.INITIALIZE}`: {
                            await this.update({
                                type: `${this.viewType}.${MessageType.INITIALIZE}`,
                                data: document.content,
                            });
                            break;
                        }
                        case `${this.viewType}.${MessageType.RESTORE}`: {
                            await this.update({
                                type: `${this.viewType}.${MessageType.RESTORE}`,
                                data: this.isBuffer ? document.content : undefined,
                            });
                            break;
                        }
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : `${error}`;
                    Logger.error(
                        "[Miranum.JsonSchema.Preview]",
                        `(Webview: ${webviewPanel.title})`,
                        message,
                    );
                }
            },
        );

        webviewPanel.onDidDispose(
            () => {
                // update lastViewState
                switch (this.closeCaller) {
                    case CloseCaller.UNDEFINED:
                    case CloseCaller.EXPLICIT: {
                        this._lastViewState = ViewState.CLOSED;
                        break;
                    }
                    case CloseCaller.IMPLICIT: {
                        this._lastViewState = ViewState.OPEN;
                        break;
                    }
                }
                this.closeCaller = CloseCaller.UNDEFINED; // reset

                // actually dispose
                this.dispose();
            },
            null,
            disposables,
        );

        return disposables;
    }
}
