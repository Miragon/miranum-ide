/**
 * This module includes helper-functions wich are use by the JSON Schema Builder and Preview.
 * @module Functions
 */

import * as vscode from "vscode";
import { Schema } from "./types";

/**
 * Get minimum form.
 */
export function getMinimum(): Schema {
    const key = "Form_" + getNonce(6).toLowerCase();
    return JSON.parse(JSON.stringify({
        "schema": {
            "key": "MyStartForm",
            "type": "object",
            "x-display": "stepper",
            "allOf": [],
        },
        "key": key,
    }));
}

/**
 * Get the default content which is displayed when the data model is empty.
 */
export function getDefault(): Schema {
    const key = "Form_" + getNonce(6).toLowerCase();
    return JSON.parse(JSON.stringify({
        "schema": {
            "key": "MyStartForm",
            "type": "object",
            "x-display": "stepper",
            "allOf": [{
                "key": "sectionKey1",
                "title": "First Section",
                "type": "object",
                "x-options": { "sectionsTitlesClasses": ["d-none"] },
                "allOf": [{
                    "key": "group1",
                    "title": "First Group",
                    "type": "object",
                    "x-options": { "childrenClass": "pl-0" },
                    "properties": {
                        "stringProp1": {
                            "fieldType": "text",
                            "title": "I am a text",
                            "type": "string",
                            "x-options": { "fieldColProps": { "cols": 12, "sm": 6 } },
                            "x-props": { "outlined": true, "dense": true },
                        },
                        "numberProp1": {
                            "fieldType": "integer",
                            "type": "integer",
                            "title": "I am a number",
                            "x-options": { "fieldColProps": { "cols": 12, "sm": 6 } },
                            "x-props": { "outlined": true, "dense": true },
                        },
                        "textarea1": {
                            "fieldType": "textarea",
                            "type": "string",
                            "x-display": "textarea",
                            "title": "I am a textarea",
                            "x-props": { "outlined": true, "dense": true },
                        },
                        "booleanprop": {
                            "fieldType": "boolean",
                            "type": "boolean",
                            "title": "I am a checkbox",
                            "x-props": { "outlined": true, "dense": true },
                        },
                        "dateprop": {
                            "fieldType": "date",
                            "type": "string",
                            "format": "date",
                            "title": "I am a date",
                            "x-props": { "outlined": true, "dense": true },
                        },
                    },
                }],
            }],
        },
        "key": key,
    }));
}

/**
 * Get the HTML-Document which display the webview
 * @param webview Webview belonging to the panel
 * @param extensionUri
 * @param initialContent
 * @param mode Says which part of the Vue-App should be displayed
 * @returns a string which represents the html content
 */
export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, initialContent: Schema, mode: string): string {
    const pathToWebview = vscode.Uri.joinPath(extensionUri, "miranum-forms-webview");

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(pathToWebview, "index.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(pathToWebview, "index.css"));
    const resetUri = webview.asWebviewUri(vscode.Uri.joinPath(pathToWebview, "css", "reset.css"));
    const fontUri = webview.asWebviewUri(vscode.Uri.joinPath(pathToWebview, "css", "materialdesignicons.min.css"));

    const jsonSchema = JSON.stringify(initialContent).replace(/'/g, "\\'");
    const nonce = getNonce();

    //TODO
    // Is there a better way to allow inline styling created by vuetify?

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />

                <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    style-src ${webview.cspSource} 'unsafe-inline';
                    font-src ${webview.cspSource};
                    img-src ${webview.cspSource};
                    script-src 'nonce-${nonce}';">

                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${resetUri}" rel="stylesheet" type="text/css" />
                <link href="${styleUri}" rel="stylesheet" type="text/css" />
                <link href="${fontUri}" rel="stylesheet" type="text/css" />

                <title>Json Schema Builder</title>
            </head>
            <body>
                <div id="app"></div>
                <script nonce="${nonce}">
                    // Store the VsCodeAPI in a global variable, so we can use it inside the Vue-App
                    const vscode = acquireVsCodeApi();
                    // Set the initial state of the webview
                    vscode.setState({
                        text: '${jsonSchema}',
                        mode: '${mode}'
                    });
                </script>
                <script type="text/javascript" src="${scriptUri}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
}

export function getNonce(length = 32): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
