/**
 * @module Out-Adapter
 * @description In the context of the "Hexagonal Architecture", Out-Adapters are objects that are called by our application. \
 * List of Adapters:
 * - {@link WebviewAdapter}
 * - {@link DocumentAdapter}
 * - {@link ReaderAdapter}
 * - {@link VsCodeConfigAdapter}
 */
import { Range, TextDocument, Uri, Webview, workspace, WorkspaceEdit } from "vscode";
import { Buffer } from "node:buffer";

import { DocumentOutPort, ReaderOutPort, VsCodeConfigOutPort, WebviewOutPort } from "../application/portsOut";
import { ConfigEditorData, VscMessage } from "@miranum-ide/vscode/shared/miranum-config-editor";

/**
 * @class WebviewAdapter
 */
export class WebviewAdapter implements WebviewOutPort {
    private activeWebview: WebviewWithId | undefined;

    async postMessage(
        webviewId: string,
        message: VscMessage<ConfigEditorData>,
    ): Promise<boolean> {
        const webview = this.validate(webviewId);
        return webview.postMessage(message);
    }

    loadActiveWebviewId(): string {
        if (!this.activeWebview) {
            throw new Error("No active webview!");
        }
        return this.activeWebview.id;
    }

    updateActiveWebview(id: string, webview: Webview): boolean {
        this.activeWebview = {
            id,
            webview,
        };
        return true;
    }

    private validate(webviewId: string): Webview {
        if (!this.activeWebview) {
            throw new Error("No active webview!");
        }
        if (this.activeWebview.id !== webviewId) {
            throw new Error("Invalid webview!");
        }

        return this.activeWebview.webview;
    }
}

interface WebviewWithId {
    id: string;
    webview: Webview;
}

/**
 * @class DocumentAdapter
 */
export class DocumentAdapter implements DocumentOutPort {
    private activeDocument: TextDocument | undefined;

    async write(fileName: string, content: string): Promise<boolean> {
        const document = this.validate(fileName);

        if (document.getText() === content) {
            throw new Error("No changes to apply!");
        }

        const edit = new WorkspaceEdit();

        edit.replace(document.uri, new Range(0, 0, document.lineCount, 0), content);

        return workspace.applyEdit(edit);
    }

    async save(fileName: string): Promise<boolean> {
        const document = this.validate(fileName);
        return document.save();
    }

    loadActiveDocument(): string {
        if (!this.activeDocument) {
            throw new Error("No active document!");
        }
        return this.activeDocument.fileName;
    }

    updateActiveDocument(document: TextDocument): boolean {
        this.activeDocument = document;
        return true;
    }

    private validate(fileName: string): TextDocument {
        if (!this.activeDocument) {
            throw new Error("No active document!");
        }
        if (this.activeDocument.fileName !== fileName) {
            throw new Error("Invalid document!");
        }

        return this.activeDocument;
    }
}

/**
 * @class ReaderAdapter
 */
export class ReaderAdapter implements ReaderOutPort {
    private readonly fs = workspace.fs;

    async readFile(fileName: string): Promise<string> {
        const uint8Array = await this.fs.readFile(Uri.file(fileName));
        return Buffer.from(uint8Array).toString();
    }
}

/**
 * @class VsCodeConfigAdapter
 */
export class VsCodeConfigAdapter implements VsCodeConfigOutPort {
    getConfiguration<T>(section: string): T | undefined {
        return workspace.getConfiguration().get<T>(section);
    }
}
