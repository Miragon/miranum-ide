/**
 * This module contains the class which handles the standard vscode text editor.
 * It includes the function for the toggle-command and handles the open and closing behaviour.
 * @module TextEditor
 */
import {
    ExtensionContext,
    Tab,
    TabInputText,
    TextDocument,
    TextDocumentShowOptions,
    TextEditor,
    ViewColumn,
    window
} from "vscode";

/**
 * Class which handles the standard vscode text editor.
 */
export abstract class StandardTextEditor {
    /** Boolean if set to `true` means that a text editor is already open. */
    private static isOpen = false;

    private static readonly config: string = "Group";

    /** The document associated with this text editor. */
    private static _document: TextDocument;

    /**
     * Function which is called by the custom text editor to set the data model of the current active editor.
     * @param document The data model of the current active custom text editor.
     */
    public static set document(document: TextDocument) {
        if (!this._document) {
            // initial call
            this._document = document;
        } else if (this._document.uri.toString() !== document.uri.toString()) {
            if (this.isOpen) {
                const tab = this.getTab();
                if (tab) {
                    this.closeTextEditor(tab).then((success) => {
                        if (success) {
                            // open a new text editor with a new document
                            this.openTextEditor(document);
                        }
                    });
                }
            }
            this._document = document;
        }
    }

    /**
     * Register ConfigChange-Event and CloseTab-Event.
     */
    public static register(context: ExtensionContext): void {
        // Event when user changes the tab
        const changeTab = window.tabGroups.onDidChangeTabs((tabs) => {
            tabs.closed.forEach((tab) => {
                if (
                    tab.input instanceof TabInputText &&
                    tab.input.uri.path === this._document.fileName
                ) {
                    this.isOpen = false;
                }
            });
        });

        context.subscriptions.push(changeTab);
    }

    /**
     * Function which is called by the custom text editor to toggle the standard text editor.
     */
    public static toggle(): void {
        if (this.isOpen) {
            const tab = this.getTab();
            if (tab) {
                this.closeTextEditor(tab);
            }
        } else {
            this.openTextEditor(this._document);
        }
    }

    /**
     * Close the text editor when the corresponding builder is closed.
     */
    public static close(): void {
        if (this.isOpen) {
            const tab = this.getTab();
            if (tab) {
                this.closeTextEditor(tab);
            }
        }
    }

    /**
     * Get the tab with the correct text editor.
     * @private
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    private static getTab(): Tab | undefined {
        for (const tabGroup of window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                if (
                    tab.input instanceof TabInputText &&
                    tab.input.uri.path === this._document.fileName
                ) {
                    return tab;
                }
            }
        }
    }

    /**
     * Close the current text editor.
     * @param tab The tab in which the text editor is displayed
     * @private
     */
    private static async closeTextEditor(tab: Tab): Promise<boolean> {
        const success = await window.tabGroups.close(tab);
        if (success) {
            this.isOpen = false;
        }
        return success;
    }

    /**
     * Open a new text editor with the current document.
     * @private
     */
    private static async openTextEditor(document: TextDocument): Promise<TextEditor> {
        const textEditor = await window.showTextDocument(
            document,
            this.getShowOptions(),
        );
        this.isOpen = true;
        return textEditor;
    }

    /**
     * Dependent on the user settings returns the right options where the standard text editor should be displayed.
     * @private
     */
    private static getShowOptions(): TextDocumentShowOptions {
        switch (this.config) {
            case "Group": {
                return {
                    preserveFocus: true,
                    preview: true,
                    viewColumn: ViewColumn.Beside,
                };
            }
            case "Tab": {
                return {
                    preserveFocus: false,
                    preview: false,
                    viewColumn: ViewColumn.Active,
                };
            }
            default: {
                return {};
            }
        }
    }
}
