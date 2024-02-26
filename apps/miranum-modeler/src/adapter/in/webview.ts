import { inject, singleton } from "tsyringe";

import { onDidReceiveMessage } from "../helper/vscode";
import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    DisplayElementTemplatesInPort,
    DisplayFormKeysInPort,
    RestoreBpmnModelerInPort,
    RestoreDmnModelerInPort,
    SyncDocumentInPort,
} from "../../application/ports/in";
import { MiranumModelerCommand } from "@miranum-ide/vscode/miranum-vscode-webview";

@singleton()
export class BpmnWebviewAdapter {
    constructor(
        @inject("DisplayBpmnModelerInPort")
        private readonly displayBpmnModelerInPort: DisplayBpmnModelerInPort,
        @inject("DisplayBpmnModelerArtifactInPort")
        private readonly displayFormKeysInPort: DisplayFormKeysInPort,
        @inject("DisplayElementTemplatesInPort")
        private readonly displayElementTemplatesInPort: DisplayElementTemplatesInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("RestoreBpmnModelerInPort")
        private readonly restoreBpmnModelerInPort: RestoreBpmnModelerInPort,
    ) {
        onDidReceiveMessage((message: MiranumModelerCommand) => {
            switch (message.type) {
                case "GetBpmnFileCommand": {
                    this.displayBpmnModelerInPort.displayBpmnFile();
                    break;
                }
                case "GetFormKeysTemplatesCommand": {
                    this.displayFormKeysInPort.sendFormKeys();
                    break;
                }
                case "GetElementTemplatesCommand": {
                    this.displayElementTemplatesInPort.sendElementTemplates();
                    break;
                }
                case "SyncDocumentCommand": {
                    this.syncDocumentInPort.syncDocument();
                    break;
                }
                case "RestoreWebviewCommand": {
                    this.restoreBpmnModelerInPort.restoreBpmnModeler();
                    break;
                }
            }
        });
    }
}

@singleton()
export class DmnWebviewAdapter {
    constructor(
        @inject("DisplayDmnFileInPort")
        private readonly displayDmnModelerInPort: DisplayDmnModelerInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("RestoreDmnModelerInPort")
        private readonly restoreDmnModelerInPort: RestoreDmnModelerInPort,
    ) {
        onDidReceiveMessage((message: MiranumModelerCommand) => {
            switch (message.type) {
                case "GetDmnFileCommand": {
                    this.displayDmnModelerInPort.displayDmnFile();
                    break;
                }
                case "SyncDocumentCommand": {
                    this.syncDocumentInPort.syncDocument();
                    break;
                }
                case "RestoreWebviewCommand": {
                    this.restoreDmnModelerInPort.restoreDmnModeler();
                    break;
                }
            }
        });
    }
}
