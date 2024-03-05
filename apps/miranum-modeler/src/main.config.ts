import { container } from "tsyringe";

import {
    VsCodeArtifactWatcherAdapter,
    VsCodeBpmnDocumentAdapter,
    VsCodeBpmnModelerAdapter,
    VsCodeBpmnWebviewAdapter as VsCodeBpmnWebviewInAdapter,
    VsCodeDmnDocumentAdapter,
    VsCodeDmnModelerAdapter,
    VsCodeDmnWebviewAdapter as VsCodeDmnWebviewInAdapter,
    VsCodeShowLoggerCommand,
    VsCodeToggleTextEditorCommand,
    VsCodeUpdateSettingsAdapter,
} from "./adapter/in";
import {
    DisplayBpmnFileUseCase,
    DisplayDmnModelerUseCase,
    GetDocumentUseCase,
    GetMiranumConfigUseCase,
    GetWorkspaceItemUseCase,
    LogMessageUseCase,
    RestoreBpmnModelerUseCase,
    RestoreDmnModelerUseCase,
    SetBpmnModelerSettingsUseCase,
    SetElementTemplatesUseCase,
    SetFormKeysUseCase,
    ShowLoggerUseCase,
    ShowMessageUseCase,
    SyncDocumentUseCase,
    ToggleTextEditorUseCase,
} from "./application/useCases";
import {
    VsCodeBpmnModelerSettingsAdapter,
    VsCodeBpmnWebviewAdapter as VsCodeBpmnWebviewOutAdapter,
    VsCodeDmnWebviewAdapter as VsCodeDmnWebviewOutAdapter,
    VsCodeDocumentAdapter,
    VsCodeLoggerAdapter,
    VsCodeReadAdapter,
    VsCodeShowMessageAdapter,
    VsCodeTextEditorAdapter,
    VsCodeWorkspaceAdapter,
} from "./adapter/out";

/**
 * The configuration of the adapter and use cases has to follow the following pattern:
 * 1. Out-Adapter
 * 2. Use Cases
 * 3. In-Adapter
 * That's because the In Adapter calls the Use Cases and the Use Cases call the Out Adapter.
 * Otherwise, constructing the classes would result in an error.
 */

export function config(): void {
    // Primitives
    container.register("ToggleTextEditorCommand", {
        useValue: "miranum-modeler.toggleTextEditor",
    });
    container.register("ShowLoggerCommand", {
        useValue: "miranum-modeler.showLogger",
    });

    // Out Adapter
    container.register("WorkspaceOutPort", VsCodeWorkspaceAdapter);
    container.register("DocumentOutPort", VsCodeDocumentAdapter);
    container.register("FileSystemOutPort", VsCodeReadAdapter);
    container.register("ShowMessageOutPort", VsCodeShowMessageAdapter);
    container.register("TextEditorOutPort", VsCodeTextEditorAdapter);
    container.register("ShowLoggerOutPort", VsCodeLoggerAdapter);
    container.register("LogMessageOutPort", VsCodeLoggerAdapter);

    // Use Cases
    container.register("GetMiranumConfigInPort", GetMiranumConfigUseCase);
    container.register("GetWorkspaceItemInPort", GetWorkspaceItemUseCase);
    container.register("GetDocumentInPort", GetDocumentUseCase);
    container.register("SyncDocumentInPort", SyncDocumentUseCase);
    container.register("ShowMessageInPort", ShowMessageUseCase);
    container.register("ToggleTextEditorInPort", ToggleTextEditorUseCase);
    container.register("ShowLoggerInPort", ShowLoggerUseCase);
    container.register("LogMessageInPort", LogMessageUseCase);

    // In Adapter
    container.register(VsCodeToggleTextEditorCommand, VsCodeToggleTextEditorCommand);
    container.register(VsCodeShowLoggerCommand, VsCodeShowLoggerCommand);

    configBpmnModeler();
    configDmnModeler();
}

function configBpmnModeler(): void {
    // Primitives
    container.register("BpmnModelerViewType", { useValue: "miranum-bpmn-modeler" });

    // Out Adapter
    container.register("DisplayBpmnModelerOutPort", VsCodeBpmnWebviewOutAdapter);
    container.register("BpmnModelerSettingsOutPort", VsCodeBpmnModelerSettingsAdapter);

    // Use Cases
    container.register("DisplayBpmnModelerInPort", DisplayBpmnFileUseCase);
    container.register("SetFormKeysInPort", SetFormKeysUseCase);
    container.register("SetElementTemplatesInPort", SetElementTemplatesUseCase);
    container.register("SetBpmnModelerSettingsInPort", SetBpmnModelerSettingsUseCase);
    container.register("RestoreBpmnModelerInPort", RestoreBpmnModelerUseCase);

    // In Adapter
    container.register(VsCodeArtifactWatcherAdapter, VsCodeArtifactWatcherAdapter);
    container.register(VsCodeUpdateSettingsAdapter, VsCodeUpdateSettingsAdapter);
    container.register(VsCodeBpmnWebviewInAdapter, VsCodeBpmnWebviewInAdapter);
    container.register(VsCodeBpmnDocumentAdapter, VsCodeBpmnDocumentAdapter);
    container.register(VsCodeBpmnModelerAdapter, VsCodeBpmnModelerAdapter); // ! ModelerAdapter is dependent on WebviewAdapter and ArtifactWatcherAdapter
}

function configDmnModeler(): void {
    // Primitives
    container.register("DmnModelerViewType", { useValue: "miranum-dmn-modeler" });

    // Out Adapter
    container.register("SendToDmnModelerOutPort", VsCodeDmnWebviewOutAdapter);

    // Use Cases
    container.register("DisplayDmnModelerInPort", DisplayDmnModelerUseCase);
    container.register("RestoreDmnModelerInPort", RestoreDmnModelerUseCase);

    // In Adapter
    container.register(VsCodeDmnWebviewInAdapter, VsCodeDmnWebviewInAdapter);
    container.register(VsCodeDmnDocumentAdapter, VsCodeDmnDocumentAdapter);
    container.register(VsCodeDmnModelerAdapter, VsCodeDmnModelerAdapter); // ! ModelerAdapter is dependent on WebviewAdapter
}
