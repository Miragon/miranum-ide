import { container } from "tsyringe";

import {
    VsCodeArtifactWatcherAdapter,
    VsCodeBpmnEditorAdapter,
    VsCodeDmnEditorAdapter,
    VsCodeOpenLoggingConsoleCommand,
    VsCodeToggleTextEditorCommand,
} from "./adapter/in";
import {
    DisplayBpmnModelerUseCase,
    DisplayDmnModelerUseCase,
    DisplayMessageUseCase,
    GetDocumentUseCase,
    GetMiranumConfigUseCase,
    GetWorkspaceItemUseCase,
    LogMessageUseCase,
    OpenLoggingConsoleUseCase,
    SetBpmnModelerSettingsUseCase,
    SetElementTemplatesUseCase,
    SetFormKeysUseCase,
    SyncDocumentUseCase,
    ToggleTextEditorUseCase,
} from "./application/useCases";
import {
    VsCodeBpmnModelerSettingsAdapter,
    VsCodeBpmnWebviewAdapter,
    VsCodeDisplayMessageAdapter,
    VsCodeDmnWebviewAdapter,
    VsCodeDocumentAdapter,
    VsCodeLoggerAdapter,
    VsCodeQuickPickAdapter,
    VsCodeReadAdapter,
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
    container.register("OpenLoggingConsoleCommand", {
        useValue: "miranum-modeler.openLoggingConsole",
    });

    // Out Adapter
    container.register("WorkspaceOutPort", VsCodeWorkspaceAdapter);
    container.register("DocumentOutPort", VsCodeDocumentAdapter);
    container.register("FileSystemOutPort", VsCodeReadAdapter);
    container.register("DisplayMessageOutPort", VsCodeDisplayMessageAdapter);
    container.register("TextEditorOutPort", VsCodeTextEditorAdapter);
    container.register("OpenLoggingConsoleOutPort", VsCodeLoggerAdapter);
    container.register("LogMessageOutPort", VsCodeLoggerAdapter);

    // Use Cases
    container.register("GetMiranumConfigInPort", GetMiranumConfigUseCase);
    container.register("GetWorkspaceItemInPort", GetWorkspaceItemUseCase);
    container.register("GetDocumentInPort", GetDocumentUseCase);
    container.register("SyncDocumentInPort", SyncDocumentUseCase);
    container.register("DisplayMessageInPort", DisplayMessageUseCase);
    container.register("ToggleTextEditorInPort", ToggleTextEditorUseCase);
    container.register("OpenLoggingConsoleInPort", OpenLoggingConsoleUseCase);
    container.register("LogMessageInPort", LogMessageUseCase);

    // In Adapter
    container.register(VsCodeToggleTextEditorCommand, VsCodeToggleTextEditorCommand);
    container.register(VsCodeOpenLoggingConsoleCommand, VsCodeOpenLoggingConsoleCommand);

    configBpmnModeler();
    configDmnModeler();
}

function configBpmnModeler(): void {
    // Primitives
    container.register("BpmnModelerViewType", { useValue: "miranum-bpmn-modeler" });
    container.register("C7ExecutionPlatformVersion", { useValue: "7.20.0" });
    container.register("C8ExecutionPlatformVersion", { useValue: "8.4.0" });

    // Out Adapter
    container.register("BpmnUiOutPort", VsCodeBpmnWebviewAdapter);
    container.register("BpmnModelerSettingsOutPort", VsCodeBpmnModelerSettingsAdapter);
    container.register("GetExecutionPlatformVersionOutPort", VsCodeQuickPickAdapter);

    // Use Cases
    container.register("DisplayBpmnModelerInPort", DisplayBpmnModelerUseCase);
    container.register("SetFormKeysInPort", SetFormKeysUseCase);
    container.register("SetElementTemplatesInPort", SetElementTemplatesUseCase);
    container.register("SetBpmnModelerSettingsInPort", SetBpmnModelerSettingsUseCase);

    // In Adapter
    container.register(VsCodeArtifactWatcherAdapter, VsCodeArtifactWatcherAdapter);
    container.register(VsCodeBpmnEditorAdapter, VsCodeBpmnEditorAdapter); // ! ModelerAdapter is dependent on WebviewAdapter and ArtifactWatcherAdapter
}

function configDmnModeler(): void {
    // Primitives
    container.register("DmnModelerViewType", { useValue: "miranum-dmn-modeler" });

    // Out Adapter
    container.register("DmnUiOutPort", VsCodeDmnWebviewAdapter);

    // Use Cases
    container.register("DisplayDmnModelerInPort", DisplayDmnModelerUseCase);

    // In Adapter
    container.register(VsCodeDmnEditorAdapter, VsCodeDmnEditorAdapter); // ! ModelerAdapter is dependent on WebviewAdapter
}
