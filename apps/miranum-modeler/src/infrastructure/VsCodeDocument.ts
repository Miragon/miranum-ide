import { Range, workspace, WorkspaceEdit } from "vscode";

import { EditorStore } from "./EditorStore";

/**
 * Provides document read/write operations for the currently active editor.
 *
 * Delegates active-editor tracking to {@link EditorStore} so no module-level
 * global state leaks out of the infrastructure layer.
 */
export class VsCodeDocument {
    /**
     * @param editorStore The store that tracks all open editor sessions.
     */
    constructor(private readonly editorStore: EditorStore) {}

    /**
     * Returns the document URI path of the currently focused editor.
     *
     * @throws {Error} If no editor is active.
     */
    getId(): string {
        return this.editorStore.getActiveEditorId();
    }

    /**
     * Returns the full text content of the active editor's document.
     *
     * @throws {Error} If no editor is active.
     */
    getContent(): string {
        const id = this.editorStore.getActiveEditorId();
        return this.editorStore.getDocumentForEditor(id).getText();
    }

    /**
     * Returns the file system path of the active editor's document.
     *
     * @throws {Error} If no editor is active.
     */
    getFilePath(): string {
        const id = this.editorStore.getActiveEditorId();
        return this.editorStore.getDocumentForEditor(id).uri.path;
    }

    /**
     * Replaces the entire document content with the given string.
     *
     * @param content New document content.
     * @returns `true` if the edit was applied, `false` if content was unchanged.
     * @throws {Error} If no editor is active.
     */
    async write(content: string): Promise<boolean> {
        const id = this.editorStore.getActiveEditorId();
        const doc = this.editorStore.getDocumentForEditor(id);

        if (doc.getText() === content) {
            return false;
        }

        const edit = new WorkspaceEdit();
        edit.replace(doc.uri, new Range(0, 0, doc.lineCount, 0), content);

        return workspace.applyEdit(edit);
    }

    /**
     * Saves the active editor's document to disk.
     *
     * @throws {Error} If no editor is active.
     */
    async save(): Promise<boolean> {
        const id = this.editorStore.getActiveEditorId();
        return this.editorStore.getDocumentForEditor(id).save();
    }
}
