import {
    Tab,
    TabInputText,
    TextDocument,
    TextDocumentShowOptions,
    TextEditor,
    ViewColumn,
    window,
} from "vscode";
import { Observer, UIComponent } from "./types";

export enum TextEditorShowOption {
    TAB = "Tab",
    GROUP = "Group",
}

export abstract class TextEditorWrapper implements Observer, UIComponent<TextDocument> {
    protected constructor() {
        window.tabGroups.onDidChangeTabs((tabs) => {
            tabs.closed.forEach((tab) => {
                if (
                    tab.input instanceof TabInputText &&
                    tab.input.uri.path === this.textEditor.document.fileName
                ) {
                    this._isOpen = false;
                }
            });
        });
    }

    private _isOpen = false;

    public get isOpen(): boolean {
        return this._isOpen;
    }

    private _textEditor?: TextEditor;

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
                this.open(document);
            }
        } catch (error) {
            console.error("", error);
        }
    }

    public async open(document: TextDocument): Promise<boolean> {
        try {
            if (!this._isOpen) {
                this._textEditor = await window
                    .showTextDocument(document, this.getShowOptions())
                    .then(
                        (textEditor) => {
                            this._isOpen = true;
                            return textEditor;
                        },
                        (reason) => {
                            throw new Error(reason);
                        },
                    );
            }

            return true;
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
            return await window.tabGroups.close(tab).then(
                (result) => {
                    this._isOpen = false;
                    return result;
                },
                (reason) => {
                    throw new Error(reason);
                },
            );
        } catch (error) {
            return Promise.reject("[TextEditor]" + error);
        }
    }

    public async update(document: TextDocument): Promise<boolean> {
        try {
            if (
                this._isOpen &&
                this.textEditor.document.uri.toString() !== document.uri.toString()
            ) {
                if (await this.close(this.textEditor.document.fileName)) {
                    return await Promise.resolve(this.open(document));
                }
            }

            return true;
        } catch (error) {
            return Promise.reject("[TextEditor]" + error);
        }
    }

    private getShowOptions(showOption = "Group"): TextDocumentShowOptions {
        switch (showOption) {
            case "Tab": {
                return {
                    preserveFocus: false,
                    preview: false,
                    viewColumn: ViewColumn.Active,
                };
            }
            default: {
                // Opens text editor in a new tab-group
                return {
                    preserveFocus: false,
                    preview: true,
                    viewColumn: ViewColumn.Beside,
                };
            }
        }
    }

    private getTab(fileName: string): Tab {
        for (const tabGroup of window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                if (
                    tab.input instanceof TabInputText &&
                    tab.input.uri.path === fileName
                ) {
                    return tab;
                }
            }
        }
        throw new Error("[TextEditor] Tab could not be found!");
    }
}
