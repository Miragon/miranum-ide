import { container, Lifecycle } from "tsyringe";

import {
    VsCodeDisplayMessageAdapter,
    VsCodeDocumentAdapter,
    VsCodeFileSystemAdapter,
    VsCodeFormEditorWebviewAdapter,
    VsCodeFormPreviewSettingsAdapter,
    VsCodeFormPreviewWebviewAdapter,
    VsCodeLoggerAdapter,
    VsCodeTextEditorAdapter,
} from "./adapter/out";
import {
    DisplayFormEditorUseCase,
    DisplayFormPreviewUseCase,
    DisplayMessageUseCase,
    GetDocumentUseCase,
    LogMessageUseCase,
    OpenLoggingConsoleUseCase,
    SetSettingUseCase,
    SplitJsonFormUseCase,
    SyncDocumentUseCase,
    ToggleTextEditorUseCase,
} from "./application/useCases";

export function config() {
    // Primitives
    container.register("OpenLoggingConsoleCommand", {
        useValue: "miranum-jsonforms.openLoggingConsole",
    });

    // Out-Adapter
    container.register("DisplayMessageOutPort", VsCodeDisplayMessageAdapter);
    container.register("OpenLoggingConsoleOutPort", VsCodeLoggerAdapter);
    container.register("LogMessageOutPort", VsCodeLoggerAdapter);

    // Use Cases
    container.register("DisplayMessageInPort", DisplayMessageUseCase);
    container.register("OpenLoggingConsoleInPort", OpenLoggingConsoleUseCase);
    container.register("LogMessageInPort", LogMessageUseCase);

    // In Adapter
    configFormPreview();
    configFormEditor();
}

function configFormEditor() {
    // Primitives
    container.register("SplitFormFileCommand", {
        useValue: "miranum-jsonforms.splitFormFile",
    });
    container.register("ToggleTextEditorCommand", {
        useValue: "miranum-jsonforms.toggleTextEditor",
    });
    container.register("FormEditorViewType", {
        useValue: "miranum-jsonforms.formEditor",
    });
    container.register("FormEditorCounter", {
        useValue: "miranum-jsonforms.formEditorCounter",
    });

    // Out-Adapter
    container.register("DocumentOutPort", VsCodeDocumentAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("FormEditorUiOutPort", VsCodeFormEditorWebviewAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("CreateFileOutPort", VsCodeFileSystemAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("TextEditorOutPort", VsCodeTextEditorAdapter, {
        lifecycle: Lifecycle.Singleton,
    });

    // UseCases
    container.register("GetDocumentInPort", GetDocumentUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("SyncDocumentInPort", SyncDocumentUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("ToggleTextEditorInPort", ToggleTextEditorUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("DisplayFormEditorInPort", DisplayFormEditorUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("SplitFileInPort", SplitJsonFormUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
}

function configFormPreview() {
    // Primitives
    container.register("ToggleFormPreviewCommand", {
        useValue: "miranum-jsonforms.togglePreview",
    });
    container.register("FormPreviewViewType", {
        useValue: "miranum-jsonforms.formPreview",
    });

    // Out-Adapter
    container.register("FormPreviewUiOutPort", VsCodeFormPreviewWebviewAdapter, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("FormPreviewSettingsOutPort", VsCodeFormPreviewSettingsAdapter, {
        lifecycle: Lifecycle.Singleton,
    });

    // UseCases
    container.register("DisplayFormPreviewInPort", DisplayFormPreviewUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
    container.register("SetSettingInPort", SetSettingUseCase, {
        lifecycle: Lifecycle.Singleton,
    });
}
