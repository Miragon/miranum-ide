import { container, Lifecycle } from "tsyringe";
import {
    DisplayBpmnModelerUseCase,
    DisplayDmnModelerUseCase,
    DisplayMessageUseCase,
    GetDiagramAsSvgUseCase,
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
import { GetDiagramAsSvgInPort } from "./application/ports/in";

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
    container.register("BpmnModelerCounter", {
        useValue: "miranum-modeler.openCustomEditors",
    });
    container.register("ToggleTextEditorCommand", {
        useValue: "miranum-modeler.toggleTextEditor",
    });
    container.register("OpenLoggingConsoleCommand", {
        useValue: "miranum-modeler.openLoggingConsole",
    });

    // Out Adapter
    container.register("WorkspaceOutPort", VsCodeWorkspaceAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("DocumentOutPort", VsCodeDocumentAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("FileSystemOutPort", VsCodeReadAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("DisplayMessageOutPort", VsCodeDisplayMessageAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("TextEditorOutPort", VsCodeTextEditorAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("OpenLoggingConsoleOutPort", VsCodeLoggerAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("LogMessageOutPort", VsCodeLoggerAdapter, {
        lifecycle: Lifecycle.Singleton,
    });

    // Use Cases
    container.register("GetMiranumConfigInPort", GetMiranumConfigUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("GetWorkspaceItemInPort", GetWorkspaceItemUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("GetDocumentInPort", GetDocumentUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("SyncDocumentInPort", SyncDocumentUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("DisplayMessageInPort", DisplayMessageUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("ToggleTextEditorInPort", ToggleTextEditorUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("OpenLoggingConsoleInPort", OpenLoggingConsoleUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("LogMessageInPort", LogMessageUseCase, {
        lifecycle: Lifecycle.Singleton,
    });

    configBpmnModeler();
    configDmnModeler();
}

function configBpmnModeler(): void {
    // Primitives
    container.register("BpmnModelerViewType", { useValue: "miranum-modeler.bpmn" });
    container.register("C7ExecutionPlatformVersion", { useValue: "7.20.0" });
    container.register("C8ExecutionPlatformVersion", { useValue: "8.4.0" });
    container.register("CopyDiagramAsSvgCommand", {
        useValue: "miranum-modeler.copyDiagramAsSvg",
    });
    container.register("SaveDiagramAsSvgCommand", {
        useValue: "miranum-modeler.saveDiagramAsSvgCommand",
    });

    // Out Adapter
    container.register("BpmnUiOutPort", VsCodeBpmnWebviewAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("BpmnModelerSettingsOutPort", VsCodeBpmnModelerSettingsAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("GetExecutionPlatformVersionOutPort", VsCodeQuickPickAdapter, {
        lifecycle: Lifecycle.Singleton,
    });

    // Use Cases
    container.register("DisplayBpmnModelerInPort", DisplayBpmnModelerUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("SetFormKeysInPort", SetFormKeysUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("SetElementTemplatesInPort", SetElementTemplatesUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("SetBpmnModelerSettingsInPort", SetBpmnModelerSettingsUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("GetDiagramAsSvgInPort", GetDiagramAsSvgUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
}

function configDmnModeler(): void {
    // Primitives
    container.register("DmnModelerViewType", { useValue: "miranum-modeler.dmn" });

    // Out Adapter
    container.register("DmnUiOutPort", VsCodeDmnWebviewAdapter, {
        lifecycle: Lifecycle.Singleton,
    });

    // Use Cases
    container.register("DisplayDmnModelerInPort", DisplayDmnModelerUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
}
