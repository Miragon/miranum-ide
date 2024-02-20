import { inject, singleton } from "tsyringe";

import { onDidReceiveMessage } from "../helper/vscode";
import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    RestoreBpmnModelerInPort,
    RestoreDmnModelerInPort,
    SyncDocumentInPort,
} from "../../application/ports/in";
import { MiranumModelerCommand } from "@miranum-ide/vscode/miranum-vscode-webview";

@singleton()
export class BpmnWebviewAdapter {
    constructor(
        @inject("SendToBpmnModelerInPort")
        private readonly sendToBpmnModelerInPort: DisplayBpmnModelerInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("RestoreBpmnModelerInPort")
        private readonly restoreBpmnModelerInPort: RestoreBpmnModelerInPort,
    ) {
        onDidReceiveMessage((message: MiranumModelerCommand) => {
            switch (message.type) {
                case "GetBpmnFileCommand": {
                    this.sendToBpmnModelerInPort.sendBpmnFile();
                    break;
                }
                case "GetFormKeysTemplatesCommand": {
                    this.sendToBpmnModelerInPort.sendFormKeys();
                    break;
                }
                case "GetElementTemplatesCommand": {
                    this.sendToBpmnModelerInPort.sendElementTemplates();
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
        @inject("SendToDmnFileInPort")
        private readonly sendToDmnModelerInPort: DisplayDmnModelerInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("RestoreDmnModelerInPort")
        private readonly restoreDmnModelerInPort: RestoreDmnModelerInPort,
    ) {
        onDidReceiveMessage((message: MiranumModelerCommand) => {
            switch (message.type) {
                case "GetDmnFileCommand": {
                    this.sendToDmnModelerInPort.sendDmnFile();
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
