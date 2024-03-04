import { inject, singleton } from "tsyringe";
import {
    DisplayBpmnModelerInPort,
    DisplayDmnModelerInPort,
    RestoreBpmnModelerInPort,
    RestoreDmnModelerInPort,
    SetElementTemplatesInPort,
    SetFormKeysInPort,
} from "../ports/in";
import { successfulMessageToBpmnModeler, successfulMessageToDmnModeler } from "../model";

@singleton()
export class RestoreBpmnModelerUseCase implements RestoreBpmnModelerInPort {
    constructor(
        @inject("DisplayBpmnModelerInPort")
        private readonly displayBpmnModelerInPort: DisplayBpmnModelerInPort,
        @inject("SetFormKeysInPort")
        private readonly setFormKeysInPort: SetFormKeysInPort,
        @inject("SetElementTemplatesInPort")
        private readonly setElementTemplatesInPort: SetElementTemplatesInPort,
    ) {}

    async restore(editorId: string): Promise<void> {
        switch (false) {
            case successfulMessageToBpmnModeler.bpmn: {
                this.displayBpmnModelerInPort.display(editorId);
                // break is omitted intentionally
            }
            case successfulMessageToBpmnModeler.formKeys: {
                this.setFormKeysInPort.set(editorId);
                // break is omitted intentionally
            }
            case successfulMessageToBpmnModeler.elementTemplates: {
                this.setElementTemplatesInPort.set(editorId);
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

    async restore(editorId: string): Promise<void> {
        if (!successfulMessageToDmnModeler.dmn)
            this.displayDmnModelerInPort.display(editorId);
    }
}
