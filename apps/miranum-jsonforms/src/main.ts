/**
 * This module contains the activate-Function which is called when the user opens a `.form`-File.
 * @module Extension
 */

import * as vscode from "vscode";
import { JsonFormsProvider } from "./app/JsonFormsProvider";

/**
 * Function called by vscode when the user opens a .form-file and no JsonSchemaBuilderProvider is registered.
 * It registers a [Custom Text Editor](https://code.visualstudio.com/api/extension-guides/custom-editors).
 * @param context The context of the extension
 */
export function activate(context: vscode.ExtensionContext) {
    // To handle .form-files as .json-files we add or create a new config in the user settings (global).
    const associations = vscode.workspace.getConfiguration("files").get<{ [k: string]: string }>("associations");
    if (associations) {
        if (!("*.jsonform" in associations)) {
            const newAssociation = associations;
            newAssociation["*.jsonform"] = "json";
            vscode.workspace.getConfiguration("files").update("associations", newAssociation, true);
        }
    } else {
        // If the configuration is not set at all we create it.
        vscode.workspace.getConfiguration("files").update("associations", { "*.jsonform": "json" }, true);
    }

    // Create custom text editor
    const builder = new JsonFormsProvider(context);
    context.subscriptions.push(vscode.window.registerCustomEditorProvider(
        JsonFormsProvider.viewType,
        builder,
        { webviewOptions: { retainContextWhenHidden: true } },
    ));
}
