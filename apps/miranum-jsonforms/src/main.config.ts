import { container } from "tsyringe";

import {
    VsCodeDisplayMessageAdapter,
    VsCodeDocumentAdapter,
    VsCodeFormBuilderWebviewAdapter,
    VsCodeFormPreviewSettingsAdapter,
    VsCodeFormPreviewWebviewAdapter,
    VsCodeLoggerAdapter,
    VsCodeTextEditorAdapter,
} from "./adapter/out";
import {
    DisplayFormBuilderUseCase,
    DisplayFormPreviewUseCase,
    DisplayMessageUseCase,
    GetDocumentUseCase,
    LogMessageUseCase,
    OpenLoggingConsoleUseCase,
    SetSettingUseCase,
    SyncDocumentUseCase,
    ToggleTextEditorUseCase,
} from "./application/useCases";
import {
    VsCodeFormBuilderAdapter,
    VsCodeFormPreviewAdapter,
    VsCodeOpenLoggingConsoleCommand,
    VsCodeToggleFormPreviewCommand,
    VsCodeToggleTextEditorCommand,
} from "./adapter/in";

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
    configFormBuilder();
}

function configFormBuilder() {
    // Primitives
    container.register("ToggleTextEditorCommand", {
        useValue: "miranum-jsonforms.toggleTextEditor",
    });
    container.register("FormBuilderViewType", {
        useValue: "miranum-jsonforms.formBuilder",
    });
    container.register("FormBuilderCounter", {
        useValue: "miranum-jsonforms.formBuilderCounter",
    });

    // Out-Adapter
    container.register("DocumentOutPort", VsCodeDocumentAdapter);
    container.register("FormBuilderUiOutPort", VsCodeFormBuilderWebviewAdapter);

    // UseCases
    container.register("TextEditorOutPort", VsCodeTextEditorAdapter);
    container.register("GetDocumentInPort", GetDocumentUseCase);
    container.register("SyncDocumentInPort", SyncDocumentUseCase);
    container.register("ToggleTextEditorInPort", ToggleTextEditorUseCase);
    container.register("DisplayFormBuilderInPort", DisplayFormBuilderUseCase);

    // In-Adapter
    container.register(VsCodeToggleTextEditorCommand, VsCodeToggleTextEditorCommand);
    container.register(VsCodeOpenLoggingConsoleCommand, VsCodeOpenLoggingConsoleCommand);
    container.register(VsCodeFormBuilderAdapter, VsCodeFormBuilderAdapter);
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
    container.register("FormPreviewUiOutPort", VsCodeFormPreviewWebviewAdapter);
    container.register("FormPreviewSettingsOutPort", VsCodeFormPreviewSettingsAdapter);

    // UseCases
    container.register("DisplayFormPreviewInPort", DisplayFormPreviewUseCase);
    container.register("SetSettingInPort", SetSettingUseCase);

    // In-Adapter
    container.register(VsCodeFormPreviewAdapter, VsCodeFormPreviewAdapter);
    container.register(VsCodeToggleFormPreviewCommand, VsCodeToggleFormPreviewCommand);
}
