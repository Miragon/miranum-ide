import * as vscode from "vscode";
import { TextDocument, TextEditor } from "vscode";
import { Updatable } from "./types";


export enum TextEditorShowOption {
    "Tab" = "Tab",
    "Group" = "Group",
}

export abstract class TextEditorWrapper implements Updatable<TextDocument> {

    protected abstract showOption: TextEditorShowOption;

    private _textEditor: TextEditor | undefined;

    private _isOpen = false;

    public get isOpen(): boolean {
        return this._isOpen;
    }

    protected constructor() {
        vscode.window.tabGroups.onDidChangeTabs((tabs) => {
            tabs.closed.forEach((tab) => {
                if (tab.input instanceof vscode.TabInputText &&
                    tab.input.uri.path === this.textEditor.document.fileName) {

                    this._isOpen = false;
                }
            });
        });
    }

    private get textEditor(): TextEditor {
        if (this._textEditor) {
            return this._textEditor;
        } else {
            throw new Error("[TextEditor] TextEditor is not initialized!");
        }
    }

    public toggle(document: TextDocument): void {
        try {
            if (this._isOpen) {
                this.close(document.fileName);
            } else {
                this.create(document);
            }
        } catch (error) {
            console.error("", error);
        }
    }

    public async create(document: TextDocument): Promise<boolean> {
        try {
            if (!this._isOpen) {
                this._textEditor = await vscode.window.showTextDocument(document, this.getShowOptions())
                    .then((textEditor) => {
                        this._isOpen = true;
                        return textEditor;
                    }, (reason) => {
                        throw new Error(reason);
                    });
            }

            return await Promise.resolve(true);

        } catch (error) {
            return Promise.reject("[TextEditor]" + error);
        }
    }

    public async close(fileName: string): Promise<boolean> {
        if (!this._isOpen) {
            return Promise.resolve(true);
        }

        try {
            const tab = this.getTab(fileName);
            return await Promise.resolve(vscode.window.tabGroups.close(tab)
                .then((result) => {
                    this._isOpen = false;
                    return result;
                }, (reason) => {
                    throw new Error(reason);
                }));

        } catch (error) {
            return Promise.reject("[TextEditor]" + error);
        }
    }

    public async update(document: TextDocument): Promise<boolean> {
        try {
            if (this._isOpen && this.textEditor.document.uri.toString() !== document.uri.toString()) {
                if (await this.close(this.textEditor.document.fileName)) {
                    return await Promise.resolve(this.create(document));
                }
            }

            return await Promise.resolve(true);

        } catch (error) {
            return Promise.reject("[TextEditor]" + error);
        }
    }

    private getShowOptions(): vscode.TextDocumentShowOptions {
        switch (this.showOption) {
            case "Group": {
                return {
                    preserveFocus: false,
                    preview: true,
                    viewColumn: vscode.ViewColumn.Beside,
                };
            }
            case "Tab": {
                return {
                    preserveFocus: false,
                    preview: false,
                    viewColumn: vscode.ViewColumn.Active,
                };
            }
            default: {
                return {};
            }
        }
    }

    private getTab(fileName: string): vscode.Tab {
        for (const tabGroup of vscode.window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                if (tab.input instanceof vscode.TabInputText &&
                    tab.input.uri.path === fileName) {

                    return tab;
                }
            }
        }
        throw new Error("[TextEditor] Tab could not be found!");
    }
}
