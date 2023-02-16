/**
 * This module contains the DocumentController for `Miranum Forms`.
 * It manages the document and updates all subscribed components when changes occur.
 * @module DocumentController
 */

import * as vscode from "vscode";
import { IContentController, Preview, TextEditorWrapper, Updatable } from "../lib";
import { getDefault, Schema } from "../utils";
import { TextDocument, Uri } from "vscode";
import { debounce } from "debounce";

export class DocumentController implements IContentController<TextDocument | Schema> {

    /** @hidden */
    public writeData = debounce(this.writeChangesToDocument);

    private static instance: DocumentController;

    /** Array of all subscribed components. */
    private observers: Updatable<TextDocument | Schema>[] = [];

    /** @hidden */
    private _document: TextDocument | undefined;

    private constructor() {
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.toString() === this.document.uri.toString() && event.contentChanges.length !== 0) {
                this.updatePreview();
            }
        });
    }

    /**
     * Get the current instance or create a new one. Ensures that there is always only one instance (Singleton).
     */
    public static getInstance(): DocumentController {
        if (this.instance === undefined) {
            this.instance = new DocumentController();
        }
        return this.instance;
    }

    /**
     * Subscribe to get notified when changes are made to the document.
     * @param observer One or more observers which subscribe for notification.
     */
    public subscribe(...observer: Updatable<TextDocument | Schema>[]): void {
        this.observers = this.observers.concat(observer);
    }

    /**
     * Get the content of the active document.
     **/
    public get content(): Schema {
        return this.getContentAsSchema(this.document.getText());
    }

    /**
     * Get the active document.
     */
    public get document(): TextDocument {
        if (this._document) {
            return this._document;
        } else {
            throw new Error("[Controller] Document is not initialized!");
        }
    }

    /**
     * Set a new document.
     * @param document The new document.
     */
    public set document(document: TextDocument) {
        this._document = document;
        this.observers.forEach((observer) => {
            try {
                switch (true) {
                    case observer instanceof Preview: {
                        const content = this.getContentAsSchema(this.document.getText());
                        observer.update(content);
                        break;
                    }
                    case observer instanceof TextEditorWrapper: {
                        observer.update(this.document);
                        break;
                    }
                }
            } catch (error) {
                console.error(error);
            }
        });
    }

    /**
     * Parses a given string to json.
     * @param text
     * @private
     */
    private getContentAsSchema(text: string): Schema {
        if (text.trim().length === 0) {
            return JSON.parse("{}");
        }

        try {
            return JSON.parse(text);
        } catch {
            throw new Error("[Controller] Could not parse text!");
        }
    }

    /**
     * Set the initial document.
     * @param document The initial document.
     */
    public async setInitialDocument(document: TextDocument) {
        this._document = document;
        if (!this.document.getText()) {
            if (await this.writeChangesToDocument(document.uri, getDefault())) {
                this.document.save();
            }
        }
    }

    /**
     * Only updates the preview and ignores other observers.
     */
    public updatePreview(): void {
        this.observers.forEach((observer) => {
            try {
                switch (true) {
                    case observer instanceof Preview: {
                        const content = this.getContentAsSchema(this.document.getText());
                        observer.update(content);
                        break;
                    }
                }
            } catch (error) {
                console.error(error);
            }
        });
    }

    /**
     * Apply changes to the document.
     * @param uri The URI of the document that should be updated.
     * @param content The data which was sent from the webview.
     * @returns Promise
     */
    public writeChangesToDocument(uri: Uri, content: Schema): Promise<boolean> {
        if (this._document && this.document.uri !== uri) {
            return Promise.reject("Inconsistent document!");
        }

        const edit = new vscode.WorkspaceEdit();
        const text = JSON.stringify(content, undefined, 4);

        edit.replace(
            this.document.uri,
            new vscode.Range(0, 0, this.document.lineCount, 0),
            text,
        );

        return Promise.resolve(vscode.workspace.applyEdit(edit));
    }
}
