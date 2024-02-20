import { inject, singleton } from "tsyringe";
import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    RestoreBpmnModelerInPort,
    RestoreDmnModelerInPort,
} from "../ports/in";
import { successfulMessageToBpmnModeler, successfulMessageToDmnModeler } from "../model";

@singleton()
export class RestoreBpmnModelerUseCase implements RestoreBpmnModelerInPort {
    constructor(
        @inject("SendToBpmnModelerInPort")
        private readonly sendToBpmnModelerInPort: DisplayBpmnModelerInPort,
    ) {}

    async restoreBpmnModeler(): Promise<void> {
        switch (false) {
            case successfulMessageToBpmnModeler.bpmn: {
                this.sendToBpmnModelerInPort.sendBpmnFile();
                // break is omitted intentionally
            }
            case successfulMessageToBpmnModeler.formKeys: {
                this.sendToBpmnModelerInPort.sendFormKeys();
                // break is omitted intentionally
            }
            case successfulMessageToBpmnModeler.elementTemplates: {
                this.sendToBpmnModelerInPort.sendElementTemplates();
                // break is omitted intentionally
            }
        }
    }
}

@singleton()
export class RestoreDmnModelerUseCase implements RestoreDmnModelerInPort {
    constructor(
        @inject("SendToDmnModelerInPort")
        private readonly sendToDmnModelerInPort: DisplayDmnModelerInPort,
    ) {}

    async restoreDmnModeler(): Promise<void> {
        if (!successfulMessageToDmnModeler.dmn)
            this.sendToDmnModelerInPort.sendDmnFile();
    }
}
