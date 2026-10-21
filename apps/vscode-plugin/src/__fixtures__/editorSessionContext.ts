import { vi } from "vitest";

import type { DocumentChangeEvent } from "@miragon/bpmn-modeler-core";

import type { EditorSessionContext } from "../modeler/editor-session/EditorSessionParticipant";

/** Session context double that records the document-change and dispose callbacks. */
export function createSessionContext(editorId: string) {
    const captured: {
        documentChange?: (event: DocumentChangeEvent) => void;
        dispose?: () => void;
    } = {};
    const context: EditorSessionContext = {
        editorId,
        panel: {} as never,
        isCurrent: () => true,
        onDocumentChange: (callback) => void (captured.documentChange = callback),
        onSettingChange: vi.fn(),
        onDispose: (callback) => void (captured.dispose = callback),
        addDisposable: vi.fn(),
    };
    return { context, captured };
}

/** A content change to `documentUri` at `documentPath`, overridable per field. */
export function documentChangeEvent(
    documentUri: string,
    documentPath: string,
    overrides: Partial<Record<keyof DocumentChangeEvent, unknown>> = {},
): DocumentChangeEvent {
    return {
        hasContentChanges: () => true,
        documentPath: () => documentPath,
        documentUriString: () => documentUri,
        ...overrides,
    } as unknown as DocumentChangeEvent;
}
