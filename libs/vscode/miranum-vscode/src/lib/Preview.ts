import * as vscode from "vscode";
import { Observer, UIComponent } from "./types";
import { Disposable, Uri, Webview, WebviewPanel } from "vscode";

export enum CloseCaller {
    "explicit" = "explicit",
    "implicit" = "implicit",
    "undefined" = "",
}

export enum ViewState {
    "open" = "open",
    "closed" = "closed",
}

interface WebviewObject {
    webviewPanel: WebviewPanel;
    disposables: Disposable[];
}

export interface WebviewOptions {
    title: string;
    icon: Uri;
}

export abstract class Preview<T> implements Observer, UIComponent<T> {
    public abstract readonly viewType: string;

    protected abstract readonly extensionUri: Uri;

    protected abstract webviewOptions: WebviewOptions;

    protected closeCaller: CloseCaller = CloseCaller.undefined;

    protected isBuffer = false;

    protected _lastViewState: ViewState = ViewState.open;

    private webviews: WebviewObject[] = [];

    private _isOpen = false;

    public abstract update(value: any): void;
    protected abstract getHtml(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
    ): string;
    protected abstract setEventHandlers(
        webviewPanel: WebviewPanel,
        ...data: T[]
    ): Disposable[];

    public get isOpen(): boolean {
        return this._isOpen;
    }

    public get lastViewState(): ViewState {
        return this._lastViewState;
    }

    public get active(): boolean {
        try {
            return this.webviewPanel.active;
        } catch (error) {
            return false;
        }
    }

    public get visible(): boolean {
        try {
            return this.webviewPanel.visible;
        } catch (error) {
            return false;
        }
    }

    public get title(): string {
        // eslint-disable-next-line no-useless-catch
        try {
            return this.webviewPanel.title;
        } catch (error) {
            throw error;
        }
    }

    protected get webview(): Webview {
        // eslint-disable-next-line no-useless-catch
        try {
            return this.webviewPanel.webview;
        } catch (error) {
            throw error;
        }
    }

    private get webviewPanel(): WebviewPanel {
        if (!this.webviews[0]) {
            throw Error("Webview is not set!");
        }
        return this.webviews[0].webviewPanel;
    }

    /**
     * Create a new webview panel.
     */
    public open(...data: T[]): void {
        // eslint-disable-next-line no-useless-catch
        try {
            this._lastViewState = ViewState.open;
            this._isOpen = true;

            // Setup webview
            const webviewPanel = vscode.window.createWebviewPanel(
                this.viewType,
                this.webviewOptions.title,
                {
                    preserveFocus: true,
                    viewColumn: vscode.ViewColumn.Beside,
                },
            );
            webviewPanel.iconPath = this.webviewOptions.icon;
            webviewPanel.webview.options = { enableScripts: true };
            webviewPanel.webview.html = this.getHtml(
                webviewPanel.webview,
                this.extensionUri,
            );
            const disposables = this.setEventHandlers(webviewPanel, ...data);

            // Make sure there will never be more than 2 webview panels inside our array
            while (this.webviews.length > 1) {
                const wp = this.webviews.pop();
                wp?.webviewPanel.dispose();
            }

            // add the current webview panel on top of our array
            // so our active preview window is always on index 0
            this.webviews.unshift({
                webviewPanel,
                disposables,
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Close the active preview window.
     */
    public close(): void {
        if (this.closeCaller !== CloseCaller.explicit) {
            this.closeCaller = CloseCaller.implicit;
        }

        // eslint-disable-next-line no-useless-catch
        try {
            // Trigger onDidDispose-Event
            this.webviews[0].webviewPanel.dispose();
        } catch (error) {
            throw error;
        }
    }

    public toggle(...data: T[]): void {
        if (this.isOpen) {
            this.closeCaller = CloseCaller.explicit;
            this.close();
        } else {
            this.open(...data);
        }
    }

    protected dispose(): void {
        const wo = this.webviews.pop();
        if (wo) {
            const webviewPanel = wo.webviewPanel;
            const disposables = wo.disposables;

            if (webviewPanel) {
                webviewPanel.dispose();
                while (disposables && disposables.length) {
                    const item = disposables.pop();
                    if (item) {
                        item.dispose();
                    }
                }
            }

            this._isOpen = false;
        }
    }
}
