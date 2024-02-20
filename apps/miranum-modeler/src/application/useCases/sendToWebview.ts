import { inject, singleton } from "tsyringe";

import { SendToBpmnModelerInPort, SendToDmnModelerInPort } from "../ports/in";
import {
    DocumentOutPort,
    ReadElementTemplatesOutPort,
    ReadFormKeysOutPort,
    SendToBpmnModelerOutPort,
    SendToDmnModelerOutPort,
    ShowMessageOutPort,
} from "../ports/out";
import { successfulMessageToBpmnModeler, successfulMessageToDmnModeler } from "../model";
import { NoMiranumConfigFoundError } from "../errors";

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
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
    ) {}

    async sendBpmnFile(): Promise<boolean> {
        try {
            let executionPlatform: string;
            const webviewId = this.documentOutPort.getFilePath();
            const bpmnFile = this.documentOutPort.getContent();

            const regex = /modeler:executionPlatformVersion="([78])\.\d+\.\d+"/;
            const match = bpmnFile.match(regex);

            if (match) {
                executionPlatform = match[1];
                successfulMessageToBpmnModeler.bpmn =
                    await this.sendToWebviewOutPort.sendBpmnFile(
                        webviewId,
                        executionPlatform,
                        bpmnFile,
                    );
                if (!successfulMessageToBpmnModeler.bpmn) {
                    // TODO: Log the error
                    this.showMessageOutPort.showErrorMessage(
                        "A problem occurred while trying to display the BPMN file.",
                    );
                }
                return successfulMessageToBpmnModeler.bpmn;
            } else {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    `Execution platform version not found!`,
                );
                return false;
            }
        } catch (error) {
            // TODO: Log the error
            this.showMessageOutPort.showErrorMessage(
                `A problem occurred while trying to display the BPMN file.\n
                ${(error as Error).message}`,
            );
            return false;
        }
    }

    async sendFormKeys(): Promise<boolean> {
        try {
            const webviewId = this.documentOutPort.getFilePath();
            const formKeys = await this.readFormKeysOutPort.readFormKeys();

            successfulMessageToBpmnModeler.formKeys =
                await this.sendToWebviewOutPort.sendFormKeys(webviewId, formKeys);

            if (!successfulMessageToBpmnModeler.formKeys) {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    "A problem occurred! `Form Keys` will not be selectable.",
                );
            }

            return successfulMessageToBpmnModeler.formKeys;
        } catch (error) {
            // TODO: Log the error
            if (error instanceof NoMiranumConfigFoundError) {
                this.showMessageOutPort.showErrorMessage(
                    "No configuration for type `form` found in `miranum.json`.",
                );
            }
            return false;
        }
    }

    async sendElementTemplates(): Promise<boolean> {
        try {
            const webviewId = this.documentOutPort.getFilePath();
            const elementTemplates =
                await this.readElementTemplateOutPort.readElementTemplates();

            successfulMessageToBpmnModeler.elementTemplates =
                await this.sendToWebviewOutPort.sendElementTemplates(
                    webviewId,
                    elementTemplates,
                );

            if (!successfulMessageToBpmnModeler.elementTemplates) {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    "A problem occurred! `Element Templates` will not be selectable.",
                );
            }

            return successfulMessageToBpmnModeler.elementTemplates;
        } catch (error) {
            // TODO: Log the error
            if (error instanceof NoMiranumConfigFoundError) {
                this.showMessageOutPort.showErrorMessage(
                    "No configuration for type `element-template` found in `miranum.json`.",
                );
            }
            return false;
        }
    }
}

@singleton()
export class SendToDmnModelerUseCase implements SendToDmnModelerInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("SendToDmnModelerOutPort")
        private readonly sendToWebviewOutPort: SendToDmnModelerOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
    ) {}

    async sendDmnFile(): Promise<boolean> {
        try {
            const webviewId = this.documentOutPort.getFilePath();
            const dmnFile = this.documentOutPort.getContent();

            successfulMessageToDmnModeler.dmn =
                await this.sendToWebviewOutPort.sendDmnFile(webviewId, dmnFile);

            if (!successfulMessageToDmnModeler.dmn) {
                // TODO: Log the error
                this.showMessageOutPort.showErrorMessage(
                    "A problem occurred while trying to display the DMN file.",
                );
            }
            return successfulMessageToDmnModeler.dmn;
        } catch (error) {
            // TODO: Log the error
            this.showMessageOutPort.showErrorMessage(
                `A problem occurred while trying to display the DMN file.\n
                ${(error as Error).message}`,
            );
            return false;
        }
    }
}
