import { container } from "tsyringe";

import {
    BpmnModelerAdapter as BpmnModelerInAdapter,
    DmnModelerAdapter as DmnModelerInAdapter,
} from "./adapter/in";
import {
    RestoreBpmnModelerUseCase,
    RestoreDmnModelerUseCase,
    SendToBpmnModelerUseCase,
    SendToDmnModelerUseCase,
} from "./application/useCases";
import {
    BpmnModelerAdapter as BpmnModelerOutAdapter,
    DmnModelerAdapter as DmnModelerOutAdapter,
} from "./adapter/out";

export function configBpmnModeler(): void {
    // Out Adapter
    container.register("SendToBpmnModelerOutPort", BpmnModelerOutAdapter);

    // Use Cases
    container.register("SendToBpmnModelerInPort", {
        useClass: SendToBpmnModelerUseCase,
    });
    container.register("RestoreBpmnModelerInPort", {
        useClass: RestoreBpmnModelerUseCase,
    });

    // In Adapter
    container.register(BpmnModelerInAdapter, { useClass: BpmnModelerInAdapter });
}

export function configDmnModeler(): void {
    // Out Adapter
    container.register("SendToDmnModelerOutPort", DmnModelerOutAdapter);

    // Use Cases
    container.register("SendToDmnModelerInPort", {
        useClass: SendToDmnModelerUseCase,
    });
    container.register("RestoreDmnModelerInPort", {
        useClass: RestoreDmnModelerUseCase,
    });

    // In Adapter
    container.register(DmnModelerInAdapter, { useClass: DmnModelerInAdapter });
}
