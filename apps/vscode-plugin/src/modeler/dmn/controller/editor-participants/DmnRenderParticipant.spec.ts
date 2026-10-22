import { describe, expect, it, vi } from "vitest";

import { DmnModelerService } from "@miragon/bpmn-modeler-core";
import { VsCodeNotifier } from "../../../../shared/infrastructure/VsCodeNotifier";
import {
    createSessionContext,
    documentChangeEvent,
} from "../../../../__fixtures__/editorSessionContext";
import { DmnRenderParticipant } from "./DmnRenderParticipant";

const EDITOR_ID = "file:///table.dmn";

function createService() {
    return {
        registerSession: vi.fn(),
        display: vi.fn(),
        disposeSession: vi.fn(),
    } as unknown as DmnModelerService;
}

const notifier = { logDebug: vi.fn() } as unknown as VsCodeNotifier;

describe("DmnRenderParticipant", () => {
    it("registers the modeler session on resolve", () => {
        const service = createService();
        const { context } = createSessionContext(EDITOR_ID);

        new DmnRenderParticipant(service, notifier).onResolve(context);

        expect(service.registerSession).toHaveBeenCalledWith(EDITOR_ID);
    });

    it("re-renders on a matching .dmn content change", () => {
        const service = createService();
        const { context, captured } = createSessionContext(EDITOR_ID);
        new DmnRenderParticipant(service, notifier).onResolve(context);

        captured.documentChange?.(documentChangeEvent(EDITOR_ID, "/table.dmn"));

        expect(service.display).toHaveBeenCalledWith(EDITOR_ID, true);
    });

    it("ignores changes to other documents or non-.dmn files", () => {
        const service = createService();
        const { context, captured } = createSessionContext(EDITOR_ID);
        new DmnRenderParticipant(service, notifier).onResolve(context);

        captured.documentChange?.(documentChangeEvent("file:///other.dmn", "/table.dmn"));
        captured.documentChange?.(documentChangeEvent(EDITOR_ID, "/table.bpmn"));
        captured.documentChange?.(
            documentChangeEvent(EDITOR_ID, "/table.dmn", { hasContentChanges: () => false }),
        );

        expect(service.display).not.toHaveBeenCalled();
    });

    it("disposes the session on teardown", () => {
        const service = createService();
        const { context, captured } = createSessionContext(EDITOR_ID);
        new DmnRenderParticipant(service, notifier).onResolve(context);

        captured.dispose?.();

        expect(service.disposeSession).toHaveBeenCalledWith(EDITOR_ID);
    });
});
