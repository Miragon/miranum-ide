import { describe, expect, it, vi } from "vitest";

import { BpmnModelerService } from "@miragon/bpmn-modeler-core";
import { VsCodeNotifier } from "../../../../shared/infrastructure/VsCodeNotifier";
import {
    createSessionContext,
    documentChangeEvent,
} from "../../../../__fixtures__/editorSessionContext";
import { BpmnRenderParticipant } from "./BpmnRenderParticipant";

const EDITOR_ID = "file:///diagram.bpmn";

function createService() {
    return {
        registerSession: vi.fn(),
        display: vi.fn(),
        disposeSession: vi.fn(),
    } as unknown as BpmnModelerService;
}

const notifier = { logDebug: vi.fn() } as unknown as VsCodeNotifier;

describe("BpmnRenderParticipant", () => {
    it("registers the modeler session on resolve", () => {
        const service = createService();
        const { context } = createSessionContext(EDITOR_ID);

        new BpmnRenderParticipant(service, notifier).onResolve(context);

        expect(service.registerSession).toHaveBeenCalledWith(EDITOR_ID);
    });

    it("re-renders on a matching .bpmn content change", () => {
        const service = createService();
        const { context, captured } = createSessionContext(EDITOR_ID);
        new BpmnRenderParticipant(service, notifier).onResolve(context);

        captured.documentChange?.(documentChangeEvent(EDITOR_ID, "/diagram.bpmn"));

        expect(service.display).toHaveBeenCalledWith(EDITOR_ID, true);
    });

    it("ignores changes to other documents or non-.bpmn files", () => {
        const service = createService();
        const { context, captured } = createSessionContext(EDITOR_ID);
        new BpmnRenderParticipant(service, notifier).onResolve(context);

        captured.documentChange?.(documentChangeEvent("file:///other.bpmn", "/diagram.bpmn"));
        captured.documentChange?.(documentChangeEvent(EDITOR_ID, "/diagram.dmn"));
        captured.documentChange?.(
            documentChangeEvent(EDITOR_ID, "/diagram.bpmn", { hasContentChanges: () => false }),
        );

        expect(service.display).not.toHaveBeenCalled();
    });

    it("disposes the session on teardown", () => {
        const service = createService();
        const { context, captured } = createSessionContext(EDITOR_ID);
        new BpmnRenderParticipant(service, notifier).onResolve(context);

        captured.dispose?.();

        expect(service.disposeSession).toHaveBeenCalledWith(EDITOR_ID);
    });
});
