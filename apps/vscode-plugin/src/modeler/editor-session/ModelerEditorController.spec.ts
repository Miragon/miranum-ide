import { beforeEach, describe, expect, it, vi } from "vitest";

// The controller only touches `window.registerCustomEditorProvider`; stub it so
// `register()` is callable and assert nothing else from `vscode`.
vi.mock("vscode", () => ({
    window: { registerCustomEditorProvider: vi.fn(() => ({ dispose: vi.fn() })) },
}));

// `VsCodeEditorHandle.create` bootstraps a real webview; replace it with a
// lightweight stub so the controller's session registration is observable
// without a live panel.
const { createSpy } = vi.hoisted(() => ({ createSpy: vi.fn() }));
vi.mock("../../shared/infrastructure/VsCodeEditorHandle", () => ({
    VsCodeEditorHandle: { create: createSpy },
}));

import { Command, SyncDocumentCommand } from "@miragon/bpmn-modeler-shared";
import { WebviewMessageRouter } from "@miragon/bpmn-modeler-core";
import { createTestHost, FakeEditorHandle } from "@miragon/bpmn-modeler-core/testing";
import { VsCodeNotifier } from "../../shared/infrastructure/VsCodeNotifier";
import { EditorSessionContext, EditorSessionParticipant } from "./EditorSessionParticipant";
import { ModelerEditorController, ModelerEditorOptions } from "./ModelerEditorController";

const EDITOR_PATH = "/diagram.bpmn";
const EDITOR_ID = `file://${EDITOR_PATH}`;

function command(type: string, fields: Record<string, unknown> = {}): Command {
    return { type, ...fields } as Command;
}

function createNotifier() {
    return {
        logDebug: vi.fn(),
        logInfo: vi.fn(),
        logError: vi.fn(),
        showError: vi.fn(),
    } as unknown as VsCodeNotifier;
}

const document = { uri: { toString: () => EDITOR_ID } } as never;
const panel = { id: "panel" } as never;
const token = {} as never;

function resolve(options: Partial<ModelerEditorOptions>, notifier = createNotifier()) {
    const host = createTestHost();
    const editor = new FakeEditorHandle(EDITOR_PATH);
    createSpy.mockReturnValue(editor);
    const fullOptions: ModelerEditorOptions = {
        viewType: "bpmn-modeler.bpmn",
        messageRouter: new WebviewMessageRouter(),
        participants: [],
        ...options,
    };
    const controller = new ModelerEditorController(host.store, notifier, fullOptions);
    return { controller, host, editor, notifier, options: fullOptions };
}

describe("ModelerEditorController.resolveCustomTextEditor", () => {
    beforeEach(() => {
        createSpy.mockReset();
    });

    it("short-circuits when delegateResolve handles the URI (diff branch)", async () => {
        const participant: EditorSessionParticipant = { onResolve: vi.fn() };
        const delegateResolve = vi.fn(() => true);
        const { controller, host } = resolve({ participants: [participant], delegateResolve });

        await controller.resolveCustomTextEditor(document, panel, token);

        expect(delegateResolve).toHaveBeenCalledWith(document, panel);
        // No session is created and no participant runs once the diff branch claims it.
        expect(createSpy).not.toHaveBeenCalled();
        expect(host.store.getEditorIds()).toEqual([]);
        expect(participant.onResolve).not.toHaveBeenCalled();
    });

    it("registers the session and runs each participant once with the editorId", async () => {
        const seen: string[] = [];
        const participantA: EditorSessionParticipant = {
            onResolve: vi.fn((ctx: EditorSessionContext) => void seen.push(ctx.editorId)),
        };
        const participantB: EditorSessionParticipant = {
            onResolve: vi.fn((ctx: EditorSessionContext) => void seen.push(ctx.editorId)),
        };
        const { controller, host, editor } = resolve({
            participants: [participantA, participantB],
        });
        const register = vi.spyOn(host.store, "register");

        await controller.resolveCustomTextEditor(document, panel, token);

        expect(register).toHaveBeenCalledTimes(1);
        expect(host.store.captureEditorSession(EDITOR_ID)).toBe(editor);
        expect(participantA.onResolve).toHaveBeenCalledTimes(1);
        expect(participantB.onResolve).toHaveBeenCalledTimes(1);
        expect(seen).toEqual([EDITOR_ID, EDITOR_ID]);

        host.openEditor("/other.bpmn");
        editor.becomeActive();
        expect(host.store.getActiveEditorId()).toBe(EDITOR_ID);
    });

    it("passes the persisted panel visibility into the handle factory", async () => {
        const { controller } = resolve({ initialPanelVisible: () => false });

        await controller.resolveCustomTextEditor(document, panel, token);

        expect(createSpy).toHaveBeenCalledWith(
            "bpmn-modeler.bpmn",
            EDITOR_ID,
            panel,
            document,
            false,
        );
    });

    it("dispatches webview messages through the router", async () => {
        const messageRouter = new WebviewMessageRouter();
        const dispatch = vi.spyOn(messageRouter, "dispatch").mockResolvedValue();
        const { controller, editor } = resolve({ messageRouter });

        await controller.resolveCustomTextEditor(document, panel, token);
        editor.receive(command("GetBpmnFileCommand"));

        await vi.waitFor(() =>
            expect(dispatch).toHaveBeenCalledWith({ type: "GetBpmnFileCommand" }, EDITOR_ID),
        );
    });

    it("queues sync while dispatching a flush reply immediately", async () => {
        const messageRouter = new WebviewMessageRouter();
        let finishSync: () => void = () => {};
        const pendingSync = new Promise<void>((resolve) => {
            finishSync = resolve;
        });
        const dispatch = vi.spyOn(messageRouter, "dispatch").mockImplementation(async (message) => {
            if (message.type === "SyncDocumentCommand") await pendingSync;
        });
        const { controller, host, editor } = resolve({ messageRouter });
        const runInEditorQueue = vi.spyOn(host.store, "runInEditorQueue");

        await controller.resolveCustomTextEditor(document, panel, token);
        editor.receive(command("GetFormReferenceStatusCommand"));
        await vi.waitFor(() => expect(dispatch).toHaveBeenCalledOnce());
        expect(runInEditorQueue).not.toHaveBeenCalled();

        const syncMessage = new SyncDocumentCommand("<latest/>");
        editor.receive(syncMessage);
        await vi.waitFor(() => expect(runInEditorQueue).toHaveBeenCalledOnce());
        expect(dispatch).toHaveBeenCalledWith(syncMessage, EDITOR_ID);

        editor.receive(command("DocumentFlushedCommand"));

        await vi.waitFor(() =>
            expect(dispatch).toHaveBeenCalledWith({ type: "DocumentFlushedCommand" }, EDITOR_ID),
        );
        expect(runInEditorQueue).toHaveBeenCalledOnce();
        finishSync();
        await host.store.waitForEditorQueue(EDITOR_ID);
        // The editor still holds its old content, so a recorded sync reads as not yet applied.
        expect(host.store.isLatestDocumentSyncApplied(EDITOR_ID, editor)).toBe(false);
    });

    it("drops a sync based on an older host document revision", async () => {
        const messageRouter = new WebviewMessageRouter();
        const dispatch = vi.spyOn(messageRouter, "dispatch").mockResolvedValue();
        const { controller, host, editor } = resolve({ messageRouter });
        const runInEditorQueue = vi.spyOn(host.store, "runInEditorQueue");

        await controller.resolveCustomTextEditor(document, panel, token);
        editor.receive(new SyncDocumentCommand("<stale/>", 1));
        await Promise.resolve();

        expect(dispatch).not.toHaveBeenCalled();
        expect(runInEditorQueue).not.toHaveBeenCalled();
        expect(host.store.isLatestDocumentSyncApplied(EDITOR_ID, editor)).toBe(true);
    });

    it("does not record a sync when a host update arrives during dispatch", async () => {
        const messageRouter = new WebviewMessageRouter();
        const { controller, host, editor } = resolve({ messageRouter });
        vi.spyOn(messageRouter, "dispatch").mockImplementation(async () => {
            host.store.markHostDocumentUpdated(EDITOR_ID);
        });
        const runInEditorQueue = vi.spyOn(host.store, "runInEditorQueue");

        await controller.resolveCustomTextEditor(document, panel, token);
        host.store.markHostDocumentUpdated(EDITOR_ID);
        editor.receive(new SyncDocumentCommand("<stale/>", 1));
        await vi.waitFor(() => expect(runInEditorQueue).toHaveBeenCalledOnce());
        await host.store.waitForEditorQueue(EDITOR_ID);

        expect(host.store.isLatestDocumentSyncApplied(EDITOR_ID, editor)).toBe(true);
    });

    it("logs a rejected dispatch instead of leaving it unhandled", async () => {
        const messageRouter = new WebviewMessageRouter();
        const error = new Error("handler boom");
        vi.spyOn(messageRouter, "dispatch").mockRejectedValue(error);
        const notifier = createNotifier();
        const { controller, editor } = resolve({ messageRouter }, notifier);

        await controller.resolveCustomTextEditor(document, panel, token);
        // The store does not await this async listener, so the rejection must be
        // caught and logged; an escaped one would fail the run as unhandled.
        editor.receive(command("SyncActivitiesCommand"));

        await vi.waitFor(() => expect(notifier.logError).toHaveBeenCalledWith(error));
    });

    it("aggregates participant teardown into the single dispose subscription", async () => {
        const teardown = vi.fn();
        const participant: EditorSessionParticipant = {
            onResolve: (ctx) => ctx.onDispose(teardown),
        };
        const { controller, host, editor } = resolve({ participants: [participant] });
        const subscribeToDisposeEvent = vi.spyOn(host.store, "subscribeToDisposeEvent");

        await controller.resolveCustomTextEditor(document, panel, token);
        expect(subscribeToDisposeEvent).toHaveBeenCalledTimes(1);
        expect(teardown).not.toHaveBeenCalled();

        editor.dispose();
        expect(teardown).toHaveBeenCalledTimes(1);
        expect(host.store.hasEditor(EDITOR_ID)).toBe(false);
    });

    it("catches resolve errors and surfaces them through the notifier", async () => {
        const notifier = createNotifier();
        const participant: EditorSessionParticipant = {
            onResolve: () => {
                throw new Error("boom");
            },
        };
        const { controller } = resolve({ participants: [participant] }, notifier);

        await expect(
            controller.resolveCustomTextEditor(document, panel, token),
        ).resolves.toBeUndefined();
        expect(notifier.showError).toHaveBeenCalledWith("boom");
        expect(notifier.logError).toHaveBeenCalled();
    });

    it("disposes resources created after an async session was replaced", async () => {
        let finishSetup: () => void = () => {};
        const setupPending = new Promise<void>((resolve) => {
            finishSetup = resolve;
        });
        const lateDisposable = { dispose: vi.fn() };
        const nextParticipant: EditorSessionParticipant = { onResolve: vi.fn() };
        const participant: EditorSessionParticipant = {
            onResolve: vi.fn(async (session: EditorSessionContext) => {
                await setupPending;
                session.addDisposable(lateDisposable);
            }),
        };
        const { controller, host } = resolve({
            participants: [participant, nextParticipant],
        });
        const addToDisposals = vi.spyOn(host.store, "addToDisposals");

        const resolving = controller.resolveCustomTextEditor(document, panel, token);
        await vi.waitFor(() => expect(participant.onResolve).toHaveBeenCalledOnce());
        host.openEditor(EDITOR_PATH);
        finishSetup();
        await resolving;

        expect(lateDisposable.dispose).toHaveBeenCalledOnce();
        expect(addToDisposals).not.toHaveBeenCalled();
        expect(nextParticipant.onResolve).not.toHaveBeenCalled();
    });
});
