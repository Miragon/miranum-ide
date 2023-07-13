/**
 * This module contains the DocumentController for `Miranum Forms`.
 * It manages the document and updates all subscribed components when changes occur.
 * @module DocumentController
 */

import { Range, TextDocument, workspace, WorkspaceEdit } from "vscode";
import { debounce } from "lodash";
import { DocumentManager, Logger, Observer } from "@miranum-ide/vscode/miranum-vscode";
import { MessageType } from "@miranum-ide/vscode/miranum-vscode-webview";
import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-forms";
import { PreviewComponent, TextEditorComponent } from "../components";
import { getDefault } from "../utils";

export class DocumentController<ContentType extends FormBuilderData>
    implements DocumentManager<ContentType>
{
    /** @hidden */
    public writeToDocument = this.asyncDebounce(this.write, 50);

    /** Array of all subscribed components. */
    private observers: Observer[] = [];

    public constructor() {
        Logger.info(
            "[Miranum.JsonSchema.DocumentController] DocumentController was created.",
        );
    }

    /** @hidden */
    private _document?: TextDocument;

    public get document(): TextDocument {
        if (!this._document) {
            throw Error("Document is not set!");
        }
        return this._document;
    }

    /**
     * Set a new document.
     * @param document The new document.
     */
    public set document(document: TextDocument) {
        this._document = document;
        this.notify();
    }

    /**
     * Get the content of the active document.
     **/
    public get content(): ContentType {
        return this.getJsonSchemaFromString(this.document.getText());
    }

    /**
     * Subscribe to get notified when changes are made to the document.
     * @param observers One or more observers which subscribe for notification.
     */
    public subscribe(...observers: Observer[]): void {
        this.observers = this.observers.concat(observers);
        Logger.info(
            "[Miranum.JsonSchema.DocumentController]",
            `${observers.length} Observer(s) subscribed.`,
        );
    }

    public unsubscribe(...observers: Observer[]): void {
        this.observers = this.observers.filter(
            (observer) => !observers.includes(observer),
        );
    }

    /**
     * Set the initial document.
     * @param document The initial document.
     */
    public async setInitialDocument(document: TextDocument) {
        this._document = document;
        if (!this.document.getText()) {
            if (await this.write(getDefault<ContentType>())) {
                this.document.save();
            }
        }
        Logger.info(
            "[Miranum.JsonSchema.DocumentController]",
            "Initial document was set.",
        );
    }

    public async notify() {
        for (const observer of this.observers) {
            try {
                if (observer instanceof PreviewComponent) {
                    await observer.update({
                        type: `${observer.viewType}.${MessageType.MSGFROMEXTENSION}`,
                        data: this.content,
                    });
                } else if (observer instanceof TextEditorComponent) {
                    await observer.update(this.document);
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Couldn't update webview.";
                Logger.error("[Miranum.JsonSchema.DocumentController]", message);
            }
        }
    }

    /**
     * Parses a given string to json.
     * @param text
     * @private
     */
    private getJsonSchemaFromString(text: string): ContentType {
        if (text.trim().length === 0) {
            return JSON.parse("{}");
        }

        try {
            return JSON.parse(text);
        } catch {
            throw new Error("Could not parse text!");
        }
    }

    /**
     * Apply changes to the document.
     * @param content The data which was sent from the webview.
     * @returns Promise
     */
    private async write(content: ContentType): Promise<boolean> {
        try {
            if (JSON.stringify(this.content) === JSON.stringify(content)) {
                throw Error("No changes to apply!");
            }

            const edit = new WorkspaceEdit();
            const text = JSON.stringify(content, undefined, 4);

            edit.replace(
                this.document.uri,
                new Range(0, 0, this.document.lineCount, 0),
                text,
            );

            return await workspace.applyEdit(edit);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    private asyncDebounce<F extends (...args: any[]) => Promise<boolean>>(
        func: F,
        wait?: number,
    ) {
        const resolveSet = new Set<(p: boolean) => void>();
        const rejectSet = new Set<(p: boolean) => void>();

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

        return (...args: Parameters<F>): ReturnType<F> =>
            new Promise((resolve, reject) => {
                resolveSet.add(resolve);
                rejectSet.add(reject);
                debounced(this, args);
            }) as ReturnType<F>;
    }
}
