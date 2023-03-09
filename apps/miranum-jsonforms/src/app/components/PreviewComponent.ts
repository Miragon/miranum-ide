/**
 * This module contains the PreviewComponent for `Miranum Forms`.
 * It handles a webview that renders the json schema.
 * @module PreviewComponent
 */

import * as vscode from "vscode";
import {getHtmlForWebview, JsonForm} from "../utils";
import {Preview, WebviewOptions} from "../lib"

export class PreviewComponent extends Preview<JsonForm> {

    /** Unique identifier for the preview. */
    public static readonly viewType = 'jsonform-renderer';
    /** Object that contains information for the webview. */
    protected readonly webviewOptions: WebviewOptions = {
        title: 'JsonForm Renderer',
        icon: vscode.Uri.joinPath(this.extensionUri, 'resources/logo_blau.png'),
        msgType: PreviewComponent.viewType + '.updateFromExtension',
    };

    constructor(protected readonly extensionUri: vscode.Uri) {
        super();
    }

    /**
     * Returns the html content that is rendered inside the webview.
     * @param webview The webview.
     * @param extensionUri The URI of the extension.
     * @param content The json schema.
     * @protected
     */
    protected getHtml(webview: vscode.Webview, extensionUri: vscode.Uri, content: JsonForm): string {
        return getHtmlForWebview(webview, extensionUri, content, 'renderer');
    }
}
