import { inject, singleton } from "tsyringe";

import {
    MiranumModelerCommand,
    SyncDocumentCommand,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import { onDidReceiveMessage } from "../out";
import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    RestoreBpmnModelerInPort,
    RestoreDmnModelerInPort,
    SetBpmnModelerSettingsInPort,
    SetElementTemplatesInPort,
    SetFormKeysInPort,
    SyncDocumentInPort,
} from "../../application/ports/in";

@singleton()
export class VsCodeBpmnWebviewAdapter {
    constructor(
        @inject("DisplayBpmnModelerInPort")
        private readonly displayBpmnModelerInPort: DisplayBpmnModelerInPort,
        @inject("SetFormKeysInPort")
        private readonly setFormKeysInPort: SetFormKeysInPort,
        @inject("SetElementTemplatesInPort")
        private readonly setElementTemplatesInPort: SetElementTemplatesInPort,
        @inject("SetBpmnModelerSettingsInPort")
        private readonly setBpmnModelerSettingsInPort: SetBpmnModelerSettingsInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("RestoreBpmnModelerInPort")
        private readonly restoreBpmnModelerInPort: RestoreBpmnModelerInPort,
    ) {}

    register() {
        onDidReceiveMessage((message: MiranumModelerCommand, editorId: string) => {
            switch (message.type) {
                case "GetBpmnFileCommand": {
                    this.displayBpmnModelerInPort.display(editorId);
                    break;
                }
                case "GetFormKeysCommand": {
                    this.setFormKeysInPort.set(editorId);
                    break;
                }
                case "GetElementTemplatesCommand": {
                    this.setElementTemplatesInPort.set(editorId);
                    break;
                }
                case "GetWebviewSettingCommand": {
                    this.setBpmnModelerSettingsInPort.set(editorId);
                    break;
                }
                case "SyncDocumentCommand": {
                    this.syncDocumentInPort.sync(
                        editorId,
                        (message as SyncDocumentCommand).content,
                    );
                    break;
                }
                case "RestoreWebviewCommand": {
                    this.restoreBpmnModelerInPort.restore(editorId);
                    break;
                }
            }
        });
    }
}

@singleton()
export class VsCodeDmnWebviewAdapter {
    constructor(
        @inject("DisplayDmnFileInPort")
        private readonly displayDmnModelerInPort: DisplayDmnModelerInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
        @inject("RestoreDmnModelerInPort")
        private readonly restoreDmnModelerInPort: RestoreDmnModelerInPort,
    ) {}

    register() {
        onDidReceiveMessage((message: MiranumModelerCommand, editorId: string) => {
            switch (message.type) {
                case "GetDmnFileCommand": {
                    this.displayDmnModelerInPort.display(editorId);
                    break;
                }
                case "SyncDocumentCommand": {
                    this.syncDocumentInPort.sync(
                        editorId,
                        (message as SyncDocumentCommand).content,
                    );
                    break;
                }
                case "RestoreWebviewCommand": {
                    this.restoreDmnModelerInPort.restore(editorId);
                    break;
                }
            }
        });
    }
}
