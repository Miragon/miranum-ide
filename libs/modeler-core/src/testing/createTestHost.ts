import { EditorSessionDocuments } from "../shared/infrastructure/EditorSessionDocuments";
import { EditorSessionStore } from "../shared/infrastructure/EditorSessionStore";
import { FakeEditorHandle } from "./FakeEditorHandle";
import {
    InMemorySecretStore,
    InMemoryTokenStore,
    ScriptedTokenPrompt,
} from "./InMemoryCredentials";
import { InMemoryDeploymentState } from "./InMemoryDeploymentState";
import {
    InMemoryClipboard,
    InMemoryPropertiesPanelState,
    RecordingDiagnostics,
} from "./inMemoryHostSurfaces";
import { InMemorySettings, SettingsValues } from "./InMemorySettings";
import { InMemoryWorkspace } from "./InMemoryWorkspace";
import { RecordingNotifier } from "./RecordingNotifier";
import { RecordingStatusBar } from "./RecordingStatusBar";
import { PickerAnswers, ScriptedPicker } from "./ScriptedPicker";

export interface TestHostOptions {
    folders?: string[];
    files?: Record<string, string>;
    settings?: Partial<SettingsValues>;
    answers?: PickerAnswers;
    tokenAnswers?: Record<string, string>;
}

/**
 * Every host port backed by memory, around a real {@link EditorSessionStore}.
 * `documents` reads and writes through the editors `openEditor` registers, as
 * the hosts' document adapters do.
 */
export function createTestHost(options: TestHostOptions = {}) {
    const store = new EditorSessionStore(() => undefined);
    return {
        store,
        documents: new EditorSessionDocuments(store),
        notifier: new RecordingNotifier(),
        picker: new ScriptedPicker(options.answers),
        settings: new InMemorySettings(options.settings),
        workspace: new InMemoryWorkspace(options.folders, options.files),
        statusBar: new RecordingStatusBar(),
        clipboard: new InMemoryClipboard(),
        secrets: new InMemorySecretStore(),
        tokens: new InMemoryTokenStore(),
        tokenPrompt: new ScriptedTokenPrompt(options.tokenAnswers),
        deploymentState: new InMemoryDeploymentState(),
        propertiesPanelState: new InMemoryPropertiesPanelState(),
        diagnostics: new RecordingDiagnostics(),
        openEditor(path: string, content = ""): FakeEditorHandle {
            const handle = new FakeEditorHandle(path, { content });
            store.register(handle);
            return handle;
        },
    };
}

export type TestHost = ReturnType<typeof createTestHost>;
