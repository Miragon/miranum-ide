import { inject, singleton } from "tsyringe";
import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    DisplayElementTemplatesInPort,
    DisplayFormKeysInPort,
    RestoreBpmnModelerInPort,
    RestoreDmnModelerInPort,
} from "../ports/in";
import { successfulMessageToBpmnModeler, successfulMessageToDmnModeler } from "../model";

@singleton()
export class RestoreBpmnModelerUseCase implements RestoreBpmnModelerInPort {
    constructor(
        @inject("DisplayBpmnModelerInPort")
        private readonly displayBpmnModelerInPort: DisplayBpmnModelerInPort,
        @inject("DisplayFormKeysInPort")
        private readonly displayFormKeysInPort: DisplayFormKeysInPort,
        @inject("DisplayElementTemplatesInPort")
        private readonly displayElementTemplatesInPort: DisplayElementTemplatesInPort,
    ) {}

    async restoreBpmnModeler(): Promise<void> {
        switch (false) {
            case successfulMessageToBpmnModeler.bpmn: {
                this.displayBpmnModelerInPort.displayBpmnFile();
                // break is omitted intentionally
            }
            case successfulMessageToBpmnModeler.formKeys: {
                this.displayFormKeysInPort.sendFormKeys();
                // break is omitted intentionally
            }
            case successfulMessageToBpmnModeler.elementTemplates: {
                this.displayElementTemplatesInPort.sendElementTemplates();
                // break is omitted intentionally
            }
        }
    }
}

@singleton()
export class RestoreDmnModelerUseCase implements RestoreDmnModelerInPort {
    constructor(
        @inject("DisplayDmnModelerInPort")
        private readonly displayDmnModelerInPort: DisplayDmnModelerInPort,
    ) {}

    async restoreDmnModeler(): Promise<void> {
        if (!successfulMessageToDmnModeler.dmn)
            this.displayDmnModelerInPort.displayDmnFile();
    }
}
