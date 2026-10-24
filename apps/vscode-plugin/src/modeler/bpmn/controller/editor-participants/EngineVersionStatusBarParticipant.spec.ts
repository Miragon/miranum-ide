import { describe, expect, it, vi } from "vitest";

import { createTestHost } from "@miragon/bpmn-modeler-core/testing";

import { VsCodeStatusBar } from "../../../../shared/infrastructure/VsCodeStatusBar";
import { EditorSessionContext } from "../../../editor-session/EditorSessionParticipant";
import { EngineVersionStatusBarParticipant } from "./EngineVersionStatusBarParticipant";

const C8_XML = '<bpmn:definitions modeler:executionPlatformVersion="8.7.0"></bpmn:definitions>';

/**
 * Context double with a mutable `panel.active` and captured view-state callback,
 * so a test can flip focus and re-fire the listener.
 */
function createContext(editorId: string, active: boolean) {
    const captured: { viewState?: () => void } = {};
    const panel = {
        active,
        onDidChangeViewState: vi.fn((cb: () => void) => {
            captured.viewState = cb;
            return { dispose: vi.fn() };
        }),
    };
    const addDisposable = vi.fn();
    const dispose: { cb?: () => void } = {};
    const context = {
        editorId,
        panel,
        onDocumentChange: vi.fn(),
        onSettingChange: vi.fn(),
        onDispose: (cb: () => void) => void (dispose.cb = cb),
        addDisposable,
    } as unknown as EditorSessionContext;
    return { context, panel, captured, addDisposable, dispose };
}

function createParticipant(active: boolean) {
    const host = createTestHost();
    const editor = host.openEditor("/work/diagram.bpmn", C8_XML);
    const participant = new EngineVersionStatusBarParticipant(
        host.statusBar as unknown as VsCodeStatusBar,
        host.documents,
    );
    return { participant, statusBar: host.statusBar, ...createContext(editor.id, active) };
}

describe("EngineVersionStatusBarParticipant", () => {
    it("registers and tracks the view-state subscription in the session bag", () => {
        const { participant, context, panel, addDisposable } = createParticipant(false);

        participant.onResolve(context);

        expect(panel.onDidChangeViewState).toHaveBeenCalledTimes(1);
        expect(addDisposable).toHaveBeenCalledTimes(1);
    });

    it("shows the engine version when the panel is active", () => {
        const { participant, statusBar, context, captured } = createParticipant(true);

        participant.onResolve(context);
        captured.viewState?.();

        expect(statusBar.engineVersion).toEqual({ platform: "c8", version: "8.7.0" });
    });

    it("hides the engine version when the panel is inactive", () => {
        const { participant, statusBar, context, captured } = createParticipant(false);
        statusBar.showEngineVersion("c7", "7.22.0");

        participant.onResolve(context);
        captured.viewState?.();

        expect(statusBar.engineVersion).toBeUndefined();
    });

    it("hides the engine version on teardown", () => {
        const { participant, statusBar, context, captured, dispose } = createParticipant(true);
        participant.onResolve(context);
        captured.viewState?.();

        dispose.cb?.();

        expect(statusBar.engineVersion).toBeUndefined();
    });
});
