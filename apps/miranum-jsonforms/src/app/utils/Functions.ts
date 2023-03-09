/**
 * This module includes helper-functions wich are use by the JSON Schema Builder and Preview.
 * @module Functions
 */

import * as vscode from "vscode";
import { JsonForm } from "./types";

/**
 * Get minimum form.
 */
export function getMinimum(): JsonForm {
    // todo: What is the minimum json object?
    return JSON.parse(JSON.stringify({
        "schema": {
            "type": "object",
            "properties": {},
        },
        "uischema": {
            "type": "VerticalLayout",
            "elements": [],
        },
        "data": {},
    }));
}

/**
 * Get the default content which is displayed when the data model is empty.
 */
export function getDefault(): JsonForm {
    return JSON.parse(JSON.stringify({
        "schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "minLength": 3,
                    "description": "Please enter your name",
                },
                "vegetarian": {
                    "type": "boolean",
                },
                "birthDate": {
                    "type": "string",
                    "format": "date",
                    "description": "Please enter your birth date.",
                },
                "nationality": {
                    "type": "string",
                    "enum": [
                        "DE",
                        "IT",
                        "JP",
                        "US",
                        "RU",
                        "Other",
                    ],
                },
                "personalData": {
                    "type": "object",
                    "properties": {
                        "age": {
                            "type": "integer",
                            "description": "Please enter your age.",
                        },
                        "height": {
                            "type": "number",
                        },
                        "drivingSkill": {
                            "type": "number",
                            "maximum": 10,
                            "minimum": 1,
                            "default": 7,
                        },
                    },
                    "required": [
                        "age",
                        "height",
                    ],
                },
                "occupation": {
                    "type": "string",
                },
                "postalCode": {
                    "type": "string",
                    "maxLength": 5,
                },
            },
            "required": [
                "occupation",
                "nationality",
            ],
        },
        "uischema": {
            "type": "VerticalLayout",
            "elements": [
                {
                    "type": "HorizontalLayout",
                    "elements": [
                        {
                            "type": "Control",
                            "scope": "#/properties/name",
                        },
                        {
                            "type": "Control",
                            "scope": "#/properties/personalData/properties/age",
                        },
                        {
                            "type": "Control",
                            "scope": "#/properties/birthDate",
                        },
                    ],
                },
                {
                    "type": "Label",
                    "text": "Additional Information",
                },
                {
                    "type": "HorizontalLayout",
                    "elements": [
                        {
                            "type": "Control",
                            "scope": "#/properties/personalData/properties/height",
                        },
                        {
                            "type": "Control",
                            "scope": "#/properties/nationality",
                        },
                        {
                            "type": "Control",
                            "scope": "#/properties/occupation",
                            "suggestion": [
                                "Accountant",
                                "Engineer",
                                "Freelancer",
                                "Journalism",
                                "Physician",
                                "Student",
                                "Teacher",
                                "Other",
                            ],
                        },
                    ],
                },
            ],
        },
    }));
}

/**
 * Get the HTML-Document which display the webview
 * @param webview Webview belonging to the panel
 * @param extensionUri
 * @param initialContent
 * @param mode
 * @returns a string which represents the html content
 */
export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, initialContent: JsonForm, mode: string): string {
    const vueAppUri = webview.asWebviewUri(vscode.Uri.joinPath(
        extensionUri, "dist", "client", "webview.mjs",
    ));

    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
        extensionUri, "resources", "css", "reset.css",
    ));

    const styleAppUri = webview.asWebviewUri(vscode.Uri.joinPath(
        extensionUri, "dist", "client", "style.css",
    ));

    const nonce = getNonce();

    // todo
    //  unsafe-eval in script-src?

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />

                <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    style-src ${webview.cspSource};
                    font-src ${webview.cspSource};
                    img-src ${webview.cspSource} data:;
                    connect-src ${webview.cspSource} https://api.iconify.design/mdi.json;
                    script-src 'nonce-${nonce}' 'unsafe-eval';">

                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${styleResetUri}" rel="stylesheet" type="text/css" />
                <link href="${styleAppUri}" rel="stylesheet" type="text/css" />

                <title>Json Schema Builder</title>
            </head>
            <body>
                <div id="app"></div>
                <script nonce="${nonce}">
                    // Store the VsCodeAPI in a global variable, so we can use it inside the Vue-App
                    const vscode = acquireVsCodeApi();
                    // Set the initial state of the webview
                    vscode.setState({
                        text: '${JSON.stringify(initialContent)}',
                        mode: '${mode}'
                    });
                </script>
                <script type="text/javascript" src="${vueAppUri}" nonce="${nonce}"></script>
            </body>
            </html>
        `;
}

export function getNonce(length = 32): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
