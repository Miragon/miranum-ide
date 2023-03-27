import { LogOutputChannel, window } from "vscode";

export class Logger {
    private static _logger: LogOutputChannel;

    private static _isOpen = false;

    public static get(): LogOutputChannel;
    public static get(channel: string): LogOutputChannel;
    public static get(channel?: string): LogOutputChannel {
        if (this._logger) {
            return this._logger;
        } else {
            if (channel) {
                return (this._logger = window.createOutputChannel(channel, {
                    log: true,
                }));
            } else {
                throw new Error(
                    "[Miranum.Modeler.Logger] Please set the output channel",
                );
            }
        }
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

    public static info(...args: string[]): void {
        if (!this._logger) {
            throw new Error("[Miranum.Modeler.Logger] Logger is not initialized!");
        }
        const message = args.join(" ");
        this._logger.info(message);
    }

    public static error(...args: string[]): void {
        if (!this._logger) {
            throw new Error("[Miranum.Modeler.Logger] Logger is not initialized!");
        }
        const message = args.join(" ");
        this._logger.error(message);
    }
}
