import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpenAllScriptTasksQuery } from "@miragon/bpmn-modeler-shared";

// The controller imports `vscode` transitively via `VsCodeNotifier`; capture the
// command registration so a test can invoke the handler the way VS Code would.
const registerCommandMock = vi.fn();
vi.mock("vscode", () => ({
    commands: { registerCommand: (...args: unknown[]) => registerCommandMock(...args) },
    Uri: { file: (path: string) => ({ scheme: "file", path, fsPath: path }) },
}));

import { EditorSessionStore } from "@miragon/bpmn-modeler-core";
import { createTestHost } from "@miragon/bpmn-modeler-core/testing";

import {
    OPEN_ALL_SCRIPT_TASKS_CMD,
    ScriptTaskCommandController,
} from "./ScriptTaskCommandController";

beforeEach(() => {
    vi.clearAllMocks();
});

/**
 * Registers the controller and returns the command handler VS Code would call,
 * so tests exercise the real registration wiring rather than a private method.
 */
function registerAndGetHandler(
    editorStore: EditorSessionStore,
    notifier: unknown,
): () => Promise<void> {
    new ScriptTaskCommandController(editorStore, notifier as never).register({
        subscriptions: [],
    } as never);
    expect(registerCommandMock).toHaveBeenCalledWith(
        OPEN_ALL_SCRIPT_TASKS_CMD,
        expect.any(Function),
        expect.anything(),
    );
    // registerCommand receives (id, handler, thisArg); VS Code invokes the
    // handler with that thisArg, so bind it here to reproduce the real call.
    const [, handler, thisArg] = registerCommandMock.mock.calls[0];
    return (handler as () => Promise<void>).bind(thisArg);
}

describe("ScriptTaskCommandController", () => {
    it("posts an OpenAllScriptTasksQuery to the active editor", async () => {
        const host = createTestHost();
        const editor = host.openEditor("/work/diagram.bpmn");
        const notifier = { logError: vi.fn(), showInfo: vi.fn() };

        await registerAndGetHandler(host.store, notifier)();

        expect(editor.posted).toHaveLength(1);
        expect(editor.posted[0]).toBeInstanceOf(OpenAllScriptTasksQuery);
        expect(notifier.logError).not.toHaveBeenCalled();
        expect(notifier.showInfo).not.toHaveBeenCalled();
    });

    it("logs and hints when there is no active editor, without rejecting", async () => {
        const host = createTestHost();
        const notifier = { logError: vi.fn(), showInfo: vi.fn() };

        await expect(registerAndGetHandler(host.store, notifier)()).resolves.toBeUndefined();

        expect(notifier.logError).toHaveBeenCalledTimes(1);
        expect(notifier.showInfo).toHaveBeenCalledTimes(1);
    });

    it("logs and hints when the active editor is hidden, without rejecting", async () => {
        const host = createTestHost();
        const editor = host.openEditor("/work/diagram.bpmn");
        editor.hidden = true;
        const notifier = { logError: vi.fn(), showInfo: vi.fn() };

        await expect(registerAndGetHandler(host.store, notifier)()).resolves.toBeUndefined();

        expect(editor.posted).toEqual([]);
        expect(notifier.logError).toHaveBeenCalledTimes(1);
        expect(notifier.showInfo).toHaveBeenCalledTimes(1);
    });
});
