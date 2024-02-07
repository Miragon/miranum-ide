import { inject, singleton } from "tsyringe";

import { onDidReceiveMessage } from "../webview";
import { SendToWebviewInPort, SyncDocumentInPort } from "../../application/ports/in";

@singleton()
class WebviewAdapter {
    constructor(
        @inject("SendBpmnFileInPort")
        private readonly sendToWebviewInPort: SendToWebviewInPort,
        @inject("SyncDocumentInPort")
        private readonly syncDocumentInPort: SyncDocumentInPort,
    ) {
        onDidReceiveMessage((message: any) => {
            switch (message.type) {
                case "GetBpmnFileCommand": {
                    this.sendBpmnFile();
                    break;
                }
                case "GetDmnFileCommand": {
                    this.sendDmnFile();
                    break;
                }
                case "GetFormKeysTemplatesCommand": {
                    this.sendFormKeysTemplates();
                    break;
                }
                case "GetElementTemplatesCommand": {
                    this.sendElementTemplates();
                    break;
                }
                case "SyncDocumentCommand": {
                    this.syncDocument();
                    break;
                }
            }
        });
    }

    sendBpmnFile(): void {
        if (this.sendToWebviewInPort.sendBpmnFile()) {
            console.log("Bpmn file content response");
        }
    }

    sendDmnFile(): void {
        if (this.sendToWebviewInPort.sendDmnFile()) {
            console.log("Dmn file content response");
        }
    }

    sendElementTemplates(): void {
        if (this.sendToWebviewInPort.sendElementTemplates()) {
            console.log("Element templates response");
        }
    }

    sendFormKeysTemplates(): void {
        if (this.sendToWebviewInPort.sendFormKeys()) {
            console.log("Forms templates response");
        }
    }

    syncDocument(): void {
        if (this.syncDocumentInPort.syncDocument()) {
            console.log("Sync document");
        }
    }
}
