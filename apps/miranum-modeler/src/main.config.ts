import { container } from "tsyringe";

import {
    BpmnModelerAdapter,
    BpmnWebviewAdapter as BpmnWebviewInAdapter,
    DmnModelerAdapter,
    DmnWebviewAdapter as DmnWebviewInAdapter,
} from "./adapter/in";
import {
    ReadMiranumJsonUseCase,
    RestoreBpmnModelerUseCase,
    RestoreDmnModelerUseCase,
    SendToBpmnModelerUseCase,
    SendToDmnModelerUseCase,
} from "./application/useCases";
import {
    BpmnWebviewAdapter as BpmnWebviewOutAdapter,
    DmnWebviewAdapter as DmnWebviewOutAdapter,
    MiranumDocumentAdapter,
    MiranumWorkspaceAdapter,
    ReadDigiWfFormKeysAdapter,
    ReadElementTemplatesAdapter,
    ReadMiranumJsonAdapter,
    VsCodeReadAdapter,
    VsCodeShowMessageAdapter,
} from "./adapter/out";

export function config(): void {
    // Out Adapter
    container.register("WorkspaceOutPort", { useClass: MiranumWorkspaceAdapter });
    container.register("DocumentOutPort", { useClass: MiranumDocumentAdapter });
    container.register("VsCodeReadOutPort", { useClass: VsCodeReadAdapter });
    container.register("ReadMiranumJsonOutPort", { useClass: ReadMiranumJsonAdapter });
    container.register("ShowMessageOutPort", { useClass: VsCodeShowMessageAdapter });

    // Use Cases
    container.register("SetConfigInPort", { useClass: ReadMiranumJsonUseCase });

    configBpmnModeler();
    configDmnModeler();
}

function configBpmnModeler(): void {
    container.register("BpmnModelerViewType", { useValue: "miranum-bpmn-modeler" });

    // Out Adapter
    container.register("ReadElementTemplatesOutPort", {
        useClass: ReadElementTemplatesAdapter,
    });
    container.register("ReadFormKeysOutPort", { useClass: ReadDigiWfFormKeysAdapter });
    container.register("SendToBpmnModelerOutPort", BpmnWebviewOutAdapter);

    // Use Cases
    container.register("SendToBpmnModelerInPort", {
        useClass: SendToBpmnModelerUseCase,
    });
    container.register("RestoreBpmnModelerInPort", {
        useClass: RestoreBpmnModelerUseCase,
    });

    // In Adapter
    container.register(BpmnModelerAdapter, { useClass: BpmnModelerAdapter });
    container.register(BpmnWebviewInAdapter, { useClass: BpmnWebviewInAdapter });
}

function configDmnModeler(): void {
    container.register("DmnModelerViewType", { useValue: "miranum-dmn-modeler" });

    // Out Adapter
    container.register("SendToDmnModelerOutPort", DmnWebviewOutAdapter);

    // Use Cases
    container.register("SendToDmnModelerInPort", {
        useClass: SendToDmnModelerUseCase,
    });
    container.register("RestoreDmnModelerInPort", {
        useClass: RestoreDmnModelerUseCase,
    });

    // In Adapter
    container.register(DmnModelerAdapter, { useClass: DmnModelerAdapter });
    container.register(DmnWebviewInAdapter, { useClass: DmnWebviewInAdapter });
}
