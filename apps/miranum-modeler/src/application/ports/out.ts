import { BpmnModelerSetting } from "../model";

type ExecutionPlatformVersion = "c7" | "c8";

interface EditorComponent {
    /**
     * Get the id of the active editor.
     * @throws {Error} if editor is not set
     */
    getId(): string;
}

export interface BpmnUiOutPort extends EditorComponent {
    /**
     * Sends the BPMN file to the active webview.
     * @param editorId
     * @param executionPlatform
     * @param bpmnFile
     * @returns true if the message was sent successfully, false otherwise
     * @throws {Error} if the editorId does not match the active editor
     */
    displayBpmnFile(
        editorId: string,
        executionPlatform: ExecutionPlatformVersion,
        bpmnFile: string,
    ): Promise<boolean>;

    /**
     * Sends the element templates to the active webview.
     * @param editorId
     * @param elementTemplates
     * @returns true if the message was sent successfully, false otherwise
     * @throws {Error} if the editorId does not match the active editor
     */
    setElementTemplates(editorId: string, elementTemplates: any[]): Promise<boolean>;

    /**
     * Sends the form keys to the active webview.
     * @param editorId
     * @param formKeys
     * @returns true if the message was sent successfully, false otherwise
     * @throws {Error} if the editorId does not match the active editor
     */
    setFormKeys(editorId: string, formKeys: string[]): Promise<boolean>;

    /**
     * Sends the settings to the active webview.
     * @param editorId
     * @param setting
     * @returns true if the message was sent successfully, false otherwise
     * @throws {Error} if the editorId does not match the active editor
     */
    setSettings(editorId: string, setting: BpmnModelerSetting): Promise<boolean>;

    /**
     * Get the BPMN diagram as SVG.
     * @param editorId
     */
    getDiagramAsSVG(editorId: string): Promise<boolean>;
}

export interface DmnUiOutPort extends EditorComponent {
    /**
     * Sends the DMN file to the active webview.
     * @param editorId
     * @param dmnFile
     * @returns {Promise<boolean>} true if the message was sent successfully
     * @throws {Error} if the editorId does not match the active editor
     */
    displayDmnFile(editorId: string, dmnFile: string): Promise<boolean>;
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

    save(): Promise<boolean>;
}

export interface WorkspaceOutPort {
    /**
     * Get workspace folders with a `miranum.json` file.
     */
    getWorkspaceFoldersWithMiranumConfig(): Promise<string[]>;

    /**
     * Get the workspace folder for the given file.
     * @param document
     * @returns {string} the path to the workspace folder
     * @throws {NoWorkspaceFolderFoundError} if the document is not in a workspace
     */
    getWorkspaceFolderForDocument(document: string): string;
}

export interface FileSystemOutPort {
    readDirectory(path: string): Promise<[string, "file" | "directory"][]>;

    readFile(path: string): Promise<string>;
}

export interface BpmnModelerSettingsOutPort {
    getAlignToOrigin(): boolean;
}

export interface GetExecutionPlatformVersionOutPort {
    getExecutionPlatformVersion(
        placeHolder: string,
        items: string[],
    ): Promise<ExecutionPlatformVersion>;
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
