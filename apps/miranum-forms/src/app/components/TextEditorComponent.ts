/**
 * This module contains the TextEditorComponent for `Miranum Forms`.
 * It handles a text editor which can be used for direct changes inside the document.
 * @module TextEditorComponent
 */

import { TextEditorShowOption, TextEditorWrapper } from "../lib";
import * as vscode from "vscode";
import { ConfigurationChangeEvent, ExtensionContext } from "vscode";

export class TextEditorComponent extends TextEditorWrapper {

    private static instance: TextEditorComponent;

    /** The default option how the text editor will be displayed. */
    protected showOption: TextEditorShowOption = TextEditorShowOption.Tab;

    private constructor() {
        super();
    }

    /**
     * Get the current instance or create a new one. Ensures that there is always only one instance (Singleton).
     */
    public static getInstance(): TextEditorComponent {
        if (!this.instance) {
            this.instance = new TextEditorComponent();
        }
        return this.instance;
    }

    /**
     * Sets the {@link showOption} according to the settings and register an event if the settings changes.
     * @param context
     */
    public setShowOption(context: ExtensionContext) {
        const config = vscode.workspace.getConfiguration("jsonSchemaBuilder").get<string>("toggleTextEditor", "Group");
        switch (true) {
            case config === "Group": {
                this.showOption = TextEditorShowOption.Group;
                break;
            }
            case config === "Tab": {
                this.showOption = TextEditorShowOption.Tab;
                break;
            }
        }

        // Event when user change the config
        const changeConfig = vscode.workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
            if (event.affectsConfiguration("jsonSchemaBuilder.toggleTextEditor")) {
                // eslint-disable-next-line @typescript-eslint/no-shadow
                const config = vscode.workspace.getConfiguration("jsonSchemaBuilder").get<string>("toggleTextEditor", "Group");
                switch (true) {
                    case config === "Group": {
                        this.showOption = TextEditorShowOption.Group;
                        break;
                    }
                    case config === "Tab": {
                        this.showOption = TextEditorShowOption.Tab;
                        break;
                    }
                }
            }
        });

        context.subscriptions.push(changeConfig);
    }
}
