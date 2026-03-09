import { Range, workspace, WorkspaceEdit } from "vscode";

import { EditorStore } from "./EditorStore";

/**
 * Provides document read/write operations for a specific editor identified by
 * its document URI path.
 *
 * All methods accept an explicit `editorId` so that operations are always
 * routed to the correct document even when multiple editors are open
 * side-by-side.  This avoids the split-view white-screen bug that occurred
 * when every operation implicitly routed through the active editor.
 *
 * Delegates document lookup to {@link EditorStore} so no module-level global
 * state leaks out of the infrastructure layer.
 */
export class VsCodeDocument {
    /**
     * @param editorStore The store that tracks all open editor sessions.
     */
    constructor(private readonly editorStore: EditorStore) {}

    /**
     * Returns the full text content of the specified editor's document.
     *
     * @param editorId Document URI path of the target editor.
     * @throws {Error} If no editor with the given id is registered.
     */
    getContent(editorId: string): string {
        return this.editorStore.getDocumentForEditor(editorId).getText();
    }

    /**
     * Returns the file system path of the specified editor's document.
     *
     * @param editorId Document URI path of the target editor.
     * @throws {Error} If no editor with the given id is registered.
     */
    getFilePath(editorId: string): string {
        return this.editorStore.getDocumentForEditor(editorId).uri.path;
    }

    /**
     * Replaces the entire content of the specified editor's document with the
     * given string.
     *
     * @param editorId Document URI path of the target editor.
     * @param content New document content.
     * @returns `true` if the edit was applied, `false` if content was unchanged.
     * @throws {Error} If no editor with the given id is registered.
     */
    async write(editorId: string, content: string): Promise<boolean> {
        const doc = this.editorStore.getDocumentForEditor(editorId);

        if (doc.getText() === content) {
            return false;
        }

        const edit = new WorkspaceEdit();
        edit.replace(doc.uri, new Range(0, 0, doc.lineCount, 0), content);

        return workspace.applyEdit(edit);
    }

    /**
     * Saves the specified editor's document to disk.
     *
     * @param editorId Document URI path of the target editor.
     * @throws {Error} If no editor with the given id is registered.
     */
    async save(editorId: string): Promise<boolean> {
        return this.editorStore.getDocumentForEditor(editorId).save();
    }
}
