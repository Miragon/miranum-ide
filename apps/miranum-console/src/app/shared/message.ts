import * as vscode from "vscode";
import { Logger } from "@miranum-ide/vscode/miranum-vscode";

export function showErrorMessage(message: string): void {
    Logger.error("[Miranum.Console]", message);
    vscode.window.showErrorMessage(message);
}

export function showInfoMessage(message: string): void {
    Logger.info("[Miranum.Console]", message);
    vscode.window.showInformationMessage(message);
}
