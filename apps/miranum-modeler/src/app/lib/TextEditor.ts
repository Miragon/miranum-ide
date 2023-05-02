/**
 * This module contains the class which handles the standard vscode text editor.
 * It includes the function for the toggle-command and handles the open and closing behaviour.
 * @module TextEditor
 */

import * as vscode from "vscode";

/**
 * Class which handles the standard vscode text editor.
 */
export abstract class TextEditor {
    /** The document associated with this text editor. */
    private static _document: vscode.TextDocument;

    /** Boolean if set to `true` means that a text editor is already open. */
    private static isOpen = false;

    /** The current configuration. */
    private static config: string;

    /**
     * Register ConfigChange-Event and CloseTab-Event.
     */
    public static register(context: vscode.ExtensionContext): void {
        this.config = vscode.workspace
            .getConfiguration("bpmn-modeler")
            .get<string>("toggleTextEditor", "Group");
        // Event when user change the config
        const changeConfig = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("bpmn-modeler.toggleTextEditor")) {
                this.config = vscode.workspace
                    .getConfiguration("bpmn-modeler")
                    .get<string>("toggleTextEditor", "Group");
            }
        });

        // Event when user change the tab
        const changeTab = vscode.window.tabGroups.onDidChangeTabs((tabs) => {
            tabs.closed.forEach((tab) => {
                if (
                    tab.input instanceof vscode.TabInputText &&
                    tab.input.uri.path === this._document.fileName
                ) {
                    this.isOpen = false;
                }
            });
        });

        context.subscriptions.push(changeConfig, changeTab);
    }

    /**
     * Function which is called by the custom text editor to set the data model of the current active editor.
     * @param document The data model of the current active custom text editor.
     */
    public static set document(document: vscode.TextDocument) {
        if (!this._document) {
            // initial call
            this._document = document;
        } else if (this._document.uri.toString() !== document.uri.toString()) {
            if (this.isOpen) {
                const tab = this.getTab();
                if (tab) {
                    this.closeTextEditor(tab).then((success) => {
                        if (success) {
                            // open new text editor with new document
                            this.openTextEditor(document);
                        }
                    });
                }
            }
            this._document = document;
        }
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
     * Close text editor when the corresponding builder is closed.
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
    private static getTab(): vscode.Tab | undefined {
        for (const tabGroup of vscode.window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                if (
                    tab.input instanceof vscode.TabInputText &&
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
    private static closeTextEditor(tab: vscode.Tab): Thenable<boolean> {
        return vscode.window.tabGroups.close(tab).then((success) => {
            if (success) {
                this.isOpen = false;
            }
            return success;
        });
    }

    /**
     * Open a new text editor with the current document.
     * @private
     */
    private static openTextEditor(
        document: vscode.TextDocument,
    ): Thenable<vscode.TextEditor> {
        return vscode.window
            .showTextDocument(document, this.getShowOptions())
            .then((textEditor) => {
                this.isOpen = true;
                return textEditor;
            });
    }

    /**
     * Dependent on the user settings returns the right options where the standard text editor should be displayed.
     * @private
     */
    private static getShowOptions(): vscode.TextDocumentShowOptions {
        switch (this.config) {
            case "Group": {
                return {
                    preserveFocus: true,
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
}
