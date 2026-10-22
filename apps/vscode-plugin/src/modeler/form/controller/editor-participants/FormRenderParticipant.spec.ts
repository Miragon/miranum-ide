import { describe, expect, it, vi } from "vitest";

import {
    createSessionContext,
    documentChangeEvent,
} from "../../../../__fixtures__/editorSessionContext";
import { FormRenderParticipant } from "./FormRenderParticipant";

const EDITOR_ID = "file:///work/order.form";
const FORM_PATH = "/work/order.form";

function createFormService() {
    return {
        registerSession: vi.fn(),
        display: vi.fn().mockResolvedValue(true),
        disposeSession: vi.fn(),
    };
}

function resolveParticipant() {
    const formService = createFormService();
    const session = createSessionContext(EDITOR_ID);
    new FormRenderParticipant(formService as never, { logDebug: vi.fn() } as never).onResolve(
        session.context,
    );
    return { formService, ...session };
}

describe("FormRenderParticipant", () => {
    it("registers the form session on resolve", () => {
        const { formService } = resolveParticipant();

        expect(formService.registerSession).toHaveBeenCalledWith(EDITOR_ID);
    });

    it("re-renders the form when its own document's content changes", () => {
        const { formService, captured } = resolveParticipant();

        captured.documentChange?.(documentChangeEvent(EDITOR_ID, FORM_PATH));

        expect(formService.display).toHaveBeenCalledWith(EDITOR_ID, true);
    });

    it("ignores other documents, non-form files and save-only changes", () => {
        const { formService, captured } = resolveParticipant();

        captured.documentChange?.(
            documentChangeEvent("file:///work/other.form", "/work/other.form"),
        );
        captured.documentChange?.(documentChangeEvent(EDITOR_ID, "/work/order.bpmn"));
        captured.documentChange?.(
            documentChangeEvent(EDITOR_ID, FORM_PATH, { hasContentChanges: () => false }),
        );

        expect(formService.display).not.toHaveBeenCalled();
    });

    it("disposes the form session on teardown", () => {
        const { formService, captured } = resolveParticipant();

        captured.dispose?.();

        expect(formService.disposeSession).toHaveBeenCalledWith(EDITOR_ID);
    });
});
