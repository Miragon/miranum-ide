import { ExtensionContext } from "vscode";

import { setContext } from "@miranum-ide/miranum-vscode";

import { EditorStore } from "./infrastructure/EditorStore";
import { VsCodeDocument } from "./infrastructure/VsCodeDocument";
import { VsCodeWorkspace } from "./infrastructure/VsCodeWorkspace";
import { VsCodeSettings } from "./infrastructure/VsCodeSettings";
import { VsCodeUI } from "./infrastructure/VsCodeUI";
import { ArtifactService } from "./service/ArtifactService";
import { BpmnModelerService } from "./service/BpmnModelerService";
import { DmnModelerService } from "./service/DmnModelerService";
import { CommandController } from "./controller/CommandController";
import { BpmnEditorController } from "./controller/BpmnEditorController";
import { DmnEditorController } from "./controller/DmnEditorController";

/**
 * VS Code extension entry point.
 *
 * Wires up all infrastructure, services, and controllers using plain
 * constructor injection — no DI framework required.
 *
 * Instantiation order:
 * 1. Infrastructure (EditorStore, VsCodeDocument, VsCodeWorkspace, VsCodeSettings, VsCodeUI)
 * 2. Services (ArtifactService, BpmnModelerService, DmnModelerService)
 * 3. Controllers (CommandController, BpmnEditorController, DmnEditorController)
 */
export function activate(context: ExtensionContext): void {
    // 1. Make the extension context globally available for helpers that need it.
    setContext(context);

    // 2. Infrastructure
    const editorStore = new EditorStore();
    const vsDocument = new VsCodeDocument(editorStore);
    const vsWorkspace = new VsCodeWorkspace();
    const vsSettings = new VsCodeSettings();
    const vsUI = new VsCodeUI();

    // 3. Services
    const artifactSvc = new ArtifactService(vsWorkspace, vsSettings);
    const bpmnService = new BpmnModelerService(
        editorStore,
        vsDocument,
        vsSettings,
        vsUI,
        artifactSvc,
    );
    const dmnService = new DmnModelerService(editorStore, vsDocument, vsUI);

    // 4. Controllers
    const commandController = new CommandController(editorStore, vsDocument, vsUI);
    new BpmnEditorController(editorStore, bpmnService, artifactSvc, vsUI).register(context);
    new DmnEditorController(editorStore, dmnService, vsUI).register(context);
    commandController.register(context);
}
