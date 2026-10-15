import { describe, expect, it, vi } from "vitest";

import { SettingChange } from "@miragon/bpmn-modeler-core";
import { ArtifactService, WatcherResult } from "@miragon/bpmn-modeler-core";
import { BpmnElementTemplatesService } from "@miragon/bpmn-modeler-core";
import { VsCodeNotifier } from "../../../../shared/infrastructure/VsCodeNotifier";
import { EditorSessionContext } from "../../../editor-session/EditorSessionParticipant";
import { ElementTemplatesParticipant } from "./ElementTemplatesParticipant";

const EDITOR_ID = "file:///diagram.bpmn";

function createContext() {
    const captured: {
        settingChange?: (event: SettingChange, id: string) => void;
        dispose?: () => void;
    } = {};
    const context: EditorSessionContext = {
        editorId: EDITOR_ID,
        panel: {} as never,
        isCurrent: () => true,
        onDocumentChange: vi.fn(),
        onSettingChange: (cb) => void (captured.settingChange = cb),
        onDispose: (cb) => void (captured.dispose = cb),
        addDisposable: vi.fn(),
    };
    return { context, captured };
}

function settingChange(affected: string): SettingChange {
    return { affectsConfiguration: (section: string) => section === affected };
}

function createServices(...watchers: WatcherResult[]) {
    const templatesSvc = {
        refreshElementTemplates: vi.fn(),
        releaseEditor: vi.fn(),
    };
    const createWatcher = vi.fn();
    watchers.forEach((watcher) => createWatcher.mockResolvedValueOnce(watcher));
    const artifactSvc = { createWatcher } as unknown as ArtifactService;
    const notifier = { showError: vi.fn(), logError: vi.fn() } as unknown as VsCodeNotifier;
    return {
        templatesSvc: templatesSvc as typeof templatesSvc & BpmnElementTemplatesService,
        artifactSvc,
        createWatcher,
        notifier,
    };
}

async function flushPromises(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

describe("ElementTemplatesParticipant", () => {
    it("re-arms the watcher and refreshes templates only when the configFolder setting changes", async () => {
        const first = { dispose: vi.fn() };
        const second = { dispose: vi.fn() };
        const { templatesSvc, artifactSvc, createWatcher, notifier } = createServices(
            { disposables: [first], errors: [] },
            { disposables: [second], errors: [] },
        );
        const { context, captured } = createContext();

        await new ElementTemplatesParticipant(templatesSvc, artifactSvc, notifier).onResolve(
            context,
        );

        captured.settingChange?.(settingChange("miragon.bpmnModeler.language"), EDITOR_ID);
        expect(templatesSvc.refreshElementTemplates).not.toHaveBeenCalled();
        expect(createWatcher).toHaveBeenCalledOnce();

        captured.settingChange?.(settingChange("miragon.bpmnModeler.configFolder"), EDITOR_ID);
        await flushPromises();

        expect(templatesSvc.refreshElementTemplates).toHaveBeenCalledWith(EDITOR_ID);
        expect(createWatcher).toHaveBeenCalledTimes(2);
        expect(first.dispose).toHaveBeenCalledOnce();
        expect(second.dispose).not.toHaveBeenCalled();
    });

    it("disposes the watcher and releases the editor's templates when the session closes", async () => {
        const disposable = { dispose: vi.fn() };
        const { templatesSvc, artifactSvc, createWatcher, notifier } = createServices({
            disposables: [disposable],
            errors: [],
        });
        const { context, captured } = createContext();

        await new ElementTemplatesParticipant(templatesSvc, artifactSvc, notifier).onResolve(
            context,
        );
        expect(createWatcher).toHaveBeenCalledWith(EDITOR_ID, templatesSvc);
        expect(disposable.dispose).not.toHaveBeenCalled();

        captured.dispose?.();

        expect(disposable.dispose).toHaveBeenCalledOnce();
        expect(templatesSvc.releaseEditor).toHaveBeenCalledWith(EDITOR_ID);
    });

    it("surfaces watcher setup errors to the user", async () => {
        const error = new Error("no workspace");
        const { templatesSvc, artifactSvc, notifier } = createServices({
            disposables: [],
            errors: [error],
        });
        const { context } = createContext();

        await new ElementTemplatesParticipant(templatesSvc, artifactSvc, notifier).onResolve(
            context,
        );

        expect(notifier.showError).toHaveBeenCalledWith("no workspace");
        expect(notifier.logError).toHaveBeenCalledWith(error);
    });
});
