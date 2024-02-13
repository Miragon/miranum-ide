import { inject, singleton } from "tsyringe";

import { SendToBpmnModelerInPort, SendToDmnModelerInPort } from "../ports/in";
import {
    DocumentOutPort,
    ReadElementTemplatesOutPort,
    ReadFormKeysOutPort,
    SendToBpmnModelerOutPort,
    SendToDmnModelerOutPort,
} from "../ports/out";
import { successfulMessageToBpmnModeler, successfulMessageToDmnModeler } from "../model";

@singleton()
export class SendToBpmnModelerUseCase implements SendToBpmnModelerInPort {
    constructor(
        @inject("ReadFileOutPort")
        private readonly readElementTemplateOutPort: ReadElementTemplatesOutPort,
        @inject("ReadFormKeysOutPort")
        private readonly readFormKeysOutPort: ReadFormKeysOutPort,
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("SendToWebviewOutPort")
        private readonly sendToWebviewOutPort: SendToBpmnModelerOutPort,
    ) {}

    async sendBpmnFile(): Promise<boolean> {
        let executionPlatform: string;
        const bpmnFile = this.documentOutPort.getContent();

        const regex = /modeler:executionPlatformVersion="([78])\.\d+\.\d+"/;
        const match = bpmnFile.match(regex);

        if (match) {
            executionPlatform = match[1];
            successfulMessageToBpmnModeler.bpmn =
                await this.sendToWebviewOutPort.sendBpmnFile(
                    executionPlatform,
                    bpmnFile,
                );
            if (!successfulMessageToBpmnModeler.bpmn) {
                // TODO: Log the error and show message
            }
            return successfulMessageToBpmnModeler.bpmn;
        } else {
            throw new Error("Execution platform version not found");
            // TODO: Log the error and show message
        }
    }

    async sendFormKeys(): Promise<boolean> {
        const formKeys = await this.readFormKeysOutPort.readFormKeys();

        successfulMessageToBpmnModeler.formKeys =
            await this.sendToWebviewOutPort.sendFormKeys(formKeys);

        if (!successfulMessageToBpmnModeler.formKeys) {
            // TODO: Log the error and show message
        }

        return successfulMessageToBpmnModeler.formKeys;
    }

    async sendElementTemplates(): Promise<boolean> {
        const elementTemplates =
            await this.readElementTemplateOutPort.readElementTemplates();

        successfulMessageToBpmnModeler.elementTemplates =
            await this.sendToWebviewOutPort.sendElementTemplates(elementTemplates);

        if (!successfulMessageToBpmnModeler.elementTemplates) {
            // TODO: Log the error and show message
        }

        return successfulMessageToBpmnModeler.elementTemplates;
    }
}

@singleton()
export class SendToDmnModelerUseCase implements SendToDmnModelerInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("SendToDmnModelerOutPort")
        private readonly sendToWebviewOutPort: SendToDmnModelerOutPort,
    ) {}

    async sendDmnFile(): Promise<boolean> {
        const dmnFile = this.documentOutPort.getContent();
        successfulMessageToDmnModeler.dmn =
            await this.sendToWebviewOutPort.sendDmnFile(dmnFile);
        if (!successfulMessageToDmnModeler.dmn) {
            // TODO: Log the error and show message
        }
        return successfulMessageToDmnModeler.dmn;
    }
}
