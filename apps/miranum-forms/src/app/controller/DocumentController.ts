/**
 * This module contains the DocumentController for `Miranum Forms`.
 * It manages the document and updates all subscribed components when changes occur.
 * @module DocumentController
 */

import * as vscode from "vscode";
import { IContentController, Preview, TextEditorWrapper, Updatable } from "../lib";
import { getDefault, Schema } from "../utils";
import { TextDocument, Uri } from "vscode";
import { debounce } from "lodash";

export class DocumentController implements IContentController<TextDocument | Schema> {

    /** @hidden */
    public writeData = this.asyncDebounce(this.writeChangesToDocument, 50);

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
        return this.getSchemaFromString(this.document.getText());
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
                        const content = this.getSchemaFromString(this.document.getText());
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
    public getSchemaFromString(text: string): Schema {
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
                        observer.update(this.content);
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
    private async writeChangesToDocument(uri: Uri, content: Schema): Promise<boolean> {
        if (this._document && this.document.uri !== uri) {
            return Promise.reject("[DocumentController] Inconsistent document!");
        } else if (JSON.stringify(this.content) === JSON.stringify(content)) {
            return Promise.reject("[DocumentController] No changes to apply!");
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

    private asyncDebounce<F extends(...args: any[]) => Promise<boolean>>(func: F, wait?: number) {
        const resolveSet = new Set<(p:boolean)=>void>();
        const rejectSet = new Set<(p:boolean)=>void>();

        const debounced = debounce((bindSelf, args: Parameters<F>) => {
            func.bind(bindSelf)(...args)
                .then((...res) => {
                    resolveSet.forEach((resolve) => resolve(...res));
                    resolveSet.clear();
                })
                .catch((...res) => {
                    rejectSet.forEach((reject) => reject(...res));
                    rejectSet.clear();
                });
        }, wait);

        return (...args: Parameters<F>): ReturnType<F> => new Promise((resolve, reject) => {
            resolveSet.add(resolve);
            rejectSet.add(reject);
            debounced(this, args);
        }) as ReturnType<F>;
    }
}
