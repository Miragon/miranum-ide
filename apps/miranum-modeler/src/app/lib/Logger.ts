import * as vscode from "vscode";
import { LogOutputChannel } from "vscode";

export class Logger {
    private static _outputChannel: string;

    private static _logger: LogOutputChannel;

    private static _isOpen = false;

    public static setOutputChannel(channel: string): void {
        this._outputChannel = channel;
    }

    public static get(): LogOutputChannel {
        if (!this._outputChannel) {
            throw new Error("[Miranum.Modeler.Logger] Please set the output channel");
        }

        if (!this._logger) {
            return this._logger = vscode.window.createOutputChannel(this._outputChannel, { log: true });
        }
        return this._logger;
    }

    public static get isOpen(): boolean {
        return this._isOpen;
    }

    public static hide() {
        this._isOpen = false;
        this._logger.hide();
    }

    public static show() {
        this._isOpen = true;
        this._logger.show(true);
    }
}
