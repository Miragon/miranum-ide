/**
 * This module contains the activate-Function which is called when the user opens a `.form`-File.
 * @module Extension
 */

import * as vscode from "vscode";
import { JsonFormsBuilder } from "./JsonFormsBuilder";
import { Logger } from "./components";

/**
 * Function called by vscode when the user opens a .form-file and no JsonFormsBuilder is registered.
 * It registers a [Custom Text Editor](https://code.visualstudio.com/api/extension-guides/custom-editors).
 * @param context The context of the extension
 */
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(Logger.get("Miranum: JsonForms"));
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(JsonFormsBuilder.VIEWTYPE, new JsonFormsBuilder(context))
    );
}
