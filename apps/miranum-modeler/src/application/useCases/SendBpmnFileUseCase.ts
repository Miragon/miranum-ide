import { inject, singleton } from "tsyringe";

import { SendToWebviewInPort } from "../ports/in";
import {
    DocumentOutPort,
    ReadElementTemplateOutPort,
    ReadFormKeysOutPort,
    SendToWebviewOutPort,
} from "../ports/out";

@singleton()
export class SendToWebviewUseCase implements SendToWebviewInPort {
    constructor(
        @inject("ReadFileOutPort")
        private readonly readElementTemplateOutPort: ReadElementTemplateOutPort,
        @inject("ReadFormKeysOutPort")
        private readonly readFormKeysOutPort: ReadFormKeysOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("SendToWebviewOutPort")
        private readonly sendToWebviewOutPort: SendToWebviewOutPort,
    ) {}

    sendBpmnFile(): boolean {
        let executionPlatform: string;
        const bpmnFile = this.documentOutPort.getContent();

        const regex = /modeler:executionPlatformVersion="([78])\.\d+\.\d+"/;
        const match = bpmnFile.match(regex);

        if (match) {
            executionPlatform = match[1];
            return this.sendToWebviewOutPort.sendBpmnFile(executionPlatform, bpmnFile);
        } else {
            throw new Error("Execution platform version not found");
            // TODO: Log the error and show message
        }
    }

    sendDmnFile(): boolean {
        const dmnFile = this.documentOutPort.getContent();
        return this.sendToWebviewOutPort.sendDmnFile(dmnFile);
    }

    sendFormKeys(): boolean {
        const path = this.documentOutPort.getWorkspacePath();
        const formKeys = this.readFormKeysOutPort.readFormKeys(path);
        return this.sendToWebviewOutPort.sendFormKeys(formKeys);
    }

    sendElementTemplates(): boolean {
        const path = this.documentOutPort.getWorkspacePath();
        const elementTemplates =
            this.readElementTemplateOutPort.readElementTemplates(path);
        return this.sendToWebviewOutPort.sendElementTemplates(elementTemplates);
    }
}
