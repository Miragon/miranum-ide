import {
    LogOutputChannel,
    Tab,
    TabInputText,
    ViewColumn,
    window,
    workspace,
} from "vscode";
import { singleton } from "tsyringe";

import {
    DisplayMessageOutPort,
    LogMessageOutPort,
    OpenLoggingConsoleOutPort,
    TextEditorOutPort,
} from "../../application/ports/out";
import { getContext } from "@miranum-ide/vscode/miranum-vscode";

@singleton()
export class VsCodeDisplayMessageAdapter implements DisplayMessageOutPort {
    info(message: string): void {
        window.showInformationMessage(message);
    }

    error(message: string): void {
        window.showErrorMessage(message);
    }
}

@singleton()
export class VsCodeTextEditorAdapter implements TextEditorOutPort {
    private isOpen = false;

    private activeDocumentPath = "";

    constructor() {
        const changeTab = window.tabGroups.onDidChangeTabs((tabs) => {
            // Event when user closes the tab with the document
            tabs.closed.forEach((tab) => {
                if (
                    tab.input instanceof TabInputText &&
                    tab.input.uri.path === this.activeDocumentPath
                ) {
                    this.isOpen = false;
                }
            });
        });

        getContext().subscriptions.push(changeTab);
    }

    async toggle(documentPath: string): Promise<boolean> {
        if (this.isOpen) {
            this.isOpen = await this.close(documentPath);
        } else {
            this.isOpen = await this.open(documentPath);
        }

        if (this.isOpen) {
            this.activeDocumentPath = documentPath;
        } else {
            this.activeDocumentPath = "";
        }

        return this.isOpen;
    }

    private async open(documentPath: string): Promise<boolean> {
        try {
            const textDocument = await workspace.openTextDocument(documentPath);
            await window.showTextDocument(textDocument, ViewColumn.Beside);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async close(documentPath: string): Promise<boolean> {
        const tab = this.getTab(documentPath);

        if (tab) {
            return window.tabGroups.close(tab);
        } else {
            return false;
        }
    }

    private getTab(documentPath: string): Tab | undefined {
        for (const tabGroup of window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                if (
                    tab.input instanceof TabInputText &&
                    tab.input.uri.path === documentPath
                ) {
                    return tab;
                }
            }
        }
        return undefined;
    }
}

@singleton()
export class VsCodeLoggerAdapter
    implements OpenLoggingConsoleOutPort, LogMessageOutPort
{
    private readonly prefix = "[MiranumIDE.Modeler] ";

    private readonly logger: LogOutputChannel = window.createOutputChannel(
        "MiranumIDE.Modeler",
        { log: true },
    );

    open() {
        this.logger.show(true);
    }

    info(message: string) {
        this.logger.info(this.prefix + message);
    }

    error(error: Error) {
        this.logger.error(this.prefix, error);
    }
}
