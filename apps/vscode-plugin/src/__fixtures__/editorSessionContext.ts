import { vi } from "vitest";

import type { DocumentChangeEvent } from "@miragon/bpmn-modeler-core";

import type { EditorSessionContext } from "@miragon/bpmn-modeler-core";

export function createSessionContext(editorId: string) {
    const captured: {
        documentChange?: (event: DocumentChangeEvent) => void;
        dispose?: () => void;
    } = {};
    const context: EditorSessionContext = {
        editorId,
        isCurrent: () => true,
        isFocused: () => true,
        onFocusChange: vi.fn(),
        onDocumentChange: (callback) => void (captured.documentChange = callback),
        onSettingChange: vi.fn(),
        onReseed: vi.fn(),
        onDispose: (callback) => void (captured.dispose = callback),
        addDisposable: vi.fn(),
    };
    return { context, captured };
}

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
