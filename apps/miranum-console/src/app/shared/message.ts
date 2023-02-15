import * as vscode from "vscode";

export function showErrorMessage(message: string): void {
    console.error(message);
    vscode.window.showErrorMessage(message);
}

export function showInfoMessage(message: string): void {
    vscode.window.showInformationMessage(message);
}
