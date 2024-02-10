import { inject, singleton } from "tsyringe";
import {
    RestoreBpmnModelerInPort,
    RestoreDmnModelerInPort,
    SendToBpmnModelerInPort,
    SendToDmnModelerInPort,
} from "../ports/in";
import { successfulMessageToBpmnModeler, successfulMessageToDmnModeler } from "../model";

@singleton()
export class RestoreBpmnModelerUseCase implements RestoreBpmnModelerInPort {
    constructor(
        @inject("SendToBpmnModelerInPort")
        private readonly sendToBpmnModelerInPort: SendToBpmnModelerInPort,
    ) {}

    async restoreBpmnModeler(): Promise<void> {
        switch (false) {
            case successfulMessageToBpmnModeler.bpmn: {
                await this.sendBpmnFile();
                break;
            }
            case successfulMessageToBpmnModeler.formKeys: {
                await this.sendFormKeys();
                break;
            }
            case successfulMessageToBpmnModeler.elementTemplates: {
                await this.sendElementTemplates();
                break;
            }
        }
    }

    private async sendBpmnFile(): Promise<boolean> {
        return this.sendToBpmnModelerInPort.sendBpmnFile();
    }

    private async sendFormKeys(): Promise<boolean> {
        return this.sendToBpmnModelerInPort.sendFormKeys();
    }

    private async sendElementTemplates(): Promise<boolean> {
        return this.sendToBpmnModelerInPort.sendElementTemplates();
    }
}

@singleton()
export class RestoreDmnModelerUseCase implements RestoreDmnModelerInPort {
    constructor(
        @inject("SendToDmnModelerInPort")
        private readonly sendToDmnModelerInPort: SendToDmnModelerInPort,
    ) {}

    async restoreDmnModeler(): Promise<void> {
        if (!successfulMessageToDmnModeler.dmn) await this.sendDmnFile();
    }

    private async sendDmnFile(): Promise<boolean> {
        return this.sendToDmnModelerInPort.sendDmnFile();
    }
}
