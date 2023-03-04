import * as vscode from "vscode";

export abstract class MiranumLogger {
    public static readonly LOGGER = vscode.window.createOutputChannel("Miranum: Modeler", { log: true });

    private static _isOpen = false;

    public static get isOpen(): boolean {
        return MiranumLogger._isOpen;
    }

    public static hide() {
        MiranumLogger._isOpen = false;
        MiranumLogger.LOGGER.hide();
    }

    public static show() {
        MiranumLogger._isOpen = true;
        MiranumLogger.LOGGER.show(true);
    }
}
