interface EditorComponent {
    /**
     * Get the id of the active editor.
     * @throws {Error} if editor is not set
     */
    getId(): string;
}

export interface FormBuilderUiOutPort extends EditorComponent {
    /**
     * @param editorId
     * @param jsonForm
     * @returns true if the message was sent successfully, false otherwise
     * @throws {Error} if the editorId does not match the active editor
     */
    display(editorId: string, jsonForm: string): Promise<boolean>;
}

export interface FormPreviewUiOutPort extends EditorComponent {
    /**
     * @param jsonForm
     * @param renderer
     * @returns true if the message was sent successfully, false otherwise
     * @throws {Error} if the editorId does not match the active editor
     */
    display(jsonForm: string, renderer: string): Promise<boolean>;

    setSetting(renderer: string): Promise<boolean>;
}

export interface FormPreviewSettingsOutPort {
    getRenderer(): string;
}

export interface DocumentOutPort extends EditorComponent {
    /**
     * Get the content of the document.
     * @throws {Error} if editor is not set
     */
    getContent(): string;

    /**
     * Get the file path of the document.
     * @throws {Error} if editor is not set
     */
    getFilePath(): string;

    /**
     * Write the content to the document.
     * @param content
     * @returns true if the content was written successfully
     * @throws {NoChangesToApplyError} if the content is the same as the current content
     * @throws {Error} if editor is not set
     */
    write(content: string): Promise<boolean>;
}

export interface CreateFileOutPort {
    write(content: string, filePath: string): Promise<void>;
}

/**
 * Display a message to the user in the UI.
 */
export interface DisplayMessageOutPort {
    info(message: string): void;

    error(message: string): void;
}

export interface TextEditorOutPort {
    /**
     * Toggles the text editor.
     * @returns true if the text editor was opened, false if it was closed
     */
    toggle(documentPath: string): Promise<boolean>;
}

export interface OpenLoggingConsoleOutPort {
    open(): void;
}

/**
 * Log a message to the console.
 */
export interface LogMessageOutPort {
    info(message: string): void;

    error(error: Error): void;
}
