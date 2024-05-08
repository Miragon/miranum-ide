import { VsCodeLogger, VsCodeTextEditor } from "@miranum-ide/vscode/miranum-vscode";

import {
    DisplayMessageOutPort,
    LogMessageOutPort,
    OpenLoggingConsoleOutPort,
    TextEditorOutPort,
} from "../../application/ports/out";
import { window } from "vscode";

export class VsCodeDisplayMessageAdapter implements DisplayMessageOutPort {
    info(message: string): void {
        window.showInformationMessage(message);
    }

    error(message: string): void {
        window.showErrorMessage(message);
    }
}

export class VsCodeTextEditorAdapter implements TextEditorOutPort {
    private readonly textEditor = new VsCodeTextEditor();

    async toggle(documentPath: string): Promise<boolean> {
        return this.textEditor.toggle(documentPath);
    }
}

export class VsCodeLoggerAdapter
    implements OpenLoggingConsoleOutPort, LogMessageOutPort
{
    private readonly logger = new VsCodeLogger("MiranumIDE.JsonForms");

    open() {
        this.logger.open();
    }

    info(message: string) {
        this.logger.info(message);
    }

    error(error: Error) {
        this.logger.error(error);
    }
}
