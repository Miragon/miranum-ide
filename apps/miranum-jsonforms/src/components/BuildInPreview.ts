/**
 * This module contains the PreviewComponent for `Miranum Forms`.
 * It handles a webview that renders the json schema.
 * @module PreviewComponent
 */

import * as vscode from "vscode";
import { Disposable, WebviewPanel } from "vscode";
import {
    CloseCaller,
    DocumentManager,
    Preview,
    ViewState,
    WebviewOptions,
} from "../lib";
import { getHtmlForWebview } from "../utils";
import { Logger } from "./Logger";
import {
    FormBuilderData,
    MessageType,
    VscMessage,
} from "@miranum-ide/vscode/shared/miranum-jsonforms";

export class BuildInPreview extends Preview<DocumentManager<FormBuilderData>> {
    /** Unique identifier for the preview. */
    public readonly viewType = "jsonforms-renderer";

    /** Object that contains information for the webview. */
    protected readonly webviewOptions: WebviewOptions = {
        title: "JsonForm Renderer",
        icon: vscode.Uri.joinPath(this.extensionUri, "assets/miranum_logo.png"),
    };

    constructor(protected readonly extensionUri: vscode.Uri) {
        super();
        Logger.info("[Miranum.JsonForms.Preview]", "Preview was created.");
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
    protected getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        return getHtmlForWebview(webview, extensionUri, this.viewType);
    }

    protected setEventHandlers(
        webviewPanel: WebviewPanel,
        document: DocumentManager<FormBuilderData>,
    ): Disposable[] {
        const disposables: Disposable[] = [];

        vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (
                event.document.uri.toString() === document.document.uri.toString() &&
                event.contentChanges.length !== 0
            ) {
                try {
                    await this.update({
                        type: `${this.viewType}.${MessageType.msgFromExtension}`,
                        data: document.content,
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : `${error}`;
                    Logger.error(
                        "[Miranum.JsonForms.Preview]",
                        `(Webview: ${webviewPanel.title})`,
                        message,
                    );
                }
            }
        });

        webviewPanel.webview.onDidReceiveMessage(
            async (message: VscMessage<FormBuilderData>) => {
                try {
                    switch (message.type) {
                        case `${this.viewType}.${MessageType.initialize}`: {
                            await this.update({
                                type: `${this.viewType}.${MessageType.initialize}`,
                                data: document.content,
                            });
                            break;
                        }
                        case `${this.viewType}.${MessageType.restore}`: {
                            await this.update({
                                type: `${this.viewType}.${MessageType.restore}`,
                                data: this.isBuffer ? document.content : undefined,
                            });
                            break;
                        }
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : `${error}`;
                    Logger.error(
                        "[Miranum.JsonForms.Preview]",
                        `(Webview: ${webviewPanel.title})`,
                        errorMsg,
                    );
                }
            },
        );

        webviewPanel.onDidDispose(
            () => {
                // update lastViewState
                switch (this.closeCaller) {
                    case CloseCaller.undefined:
                    case CloseCaller.explicit: {
                        this._lastViewState = ViewState.closed;
                        break;
                    }
                    case CloseCaller.implicit: {
                        this._lastViewState = ViewState.open;
                        break;
                    }
                }
                this.closeCaller = CloseCaller.undefined; // reset

                // actually dispose
                this.dispose();
            },
            null,
            disposables,
        );

        return disposables;
    }
}
