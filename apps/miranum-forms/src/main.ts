/**
 * This module contains the activate-Function which is called when the user opens a `.form`-File.
 * @module Extension
 */

import { ExtensionContext, window, workspace } from "vscode";
import { JsonSchemaBuilderProvider } from "./app/JsonSchemaBuilderProvider";
import { Logger } from "@miranum-ide/vscode/miranum-vscode";

/**
 * Function called by vscode when the user opens a .form-file and no JsonSchemaBuilderProvider is registered.
 * It registers a [Custom Text Editor](https://code.visualstudio.com/api/extension-guides/custom-editors).
 * @param context The context of the extension
 */
export function activate(context: ExtensionContext) {
    // To handle .form-files as .json-files we add or create a new config in the user settings (global).
    const associations = workspace
        .getConfiguration("files")
        .get<{ [k: string]: string }>("associations");
    if (associations) {
        if (!("*.form" in associations)) {
            const newAssociation = associations;
            newAssociation["*.form"] = "json";
            workspace
                .getConfiguration("files")
                .update("associations", newAssociation, true);
        }
    } else {
        // If the configuration is not set at all we create it.
        workspace
            .getConfiguration("files")
            .update("associations", { "*.form": "json" }, true);
    }

    // Create custom text editor
    context.subscriptions.push(Logger.get("Miranum: JsonSchema"));
    context.subscriptions.push(
        window.registerCustomEditorProvider(
            JsonSchemaBuilderProvider.VIEWTYPE,
            new JsonSchemaBuilderProvider(context),
            { webviewOptions: { retainContextWhenHidden: true } },
        ),
    );
}
