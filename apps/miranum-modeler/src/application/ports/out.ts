export interface SendToBpmnModelerOutPort {
    /**
     * Sends the BPMN file to the active webview.
     * @param webviewId
     * @param executionPlatform
     * @param bpmnFile
     * @returns {Promise<boolean>} true if the message was sent successfully
     * @throws {Error} if the webview id does not match the active webview id
     */
    sendBpmnFile(
        webviewId: string,
        executionPlatform: string,
        bpmnFile: string,
    ): Promise<boolean>;

    /**
     * Sends the element templates to the active webview.
     * @param webviewId
     * @param elementTemplates
     * @returns {Promise<boolean>} true if the message was sent successfully
     * @throws {Error} if the webview id does not match the active webview id
     */
    sendElementTemplates(
        webviewId: string,
        elementTemplates: string[],
    ): Promise<boolean>;

    /**
     * Sends the form keys to the active webview.
     * @param webviewId
     * @param formKeys
     * @returns {Promise<boolean>} true if the message was sent successfully
     * @throws {Error} if the webview id does not match the active webview id
     */
    sendFormKeys(webviewId: string, formKeys: string[]): Promise<boolean>;
}

export interface SendToDmnModelerOutPort {
    /**
     * Sends the DMN file to the active webview.
     * @param webviewId
     * @param dmnFile
     * @returns {Promise<boolean>} true if the message was sent successfully
     * @throws {Error} if the webview id does not match the active webview id
     */
    sendDmnFile(webviewId: string, dmnFile: string): Promise<boolean>;
}

export interface DocumentOutPort {
    /**
     * Get the content of the document.
     * @throws {Error} if the document is not set
     */
    getContent(): string;

    /**
     * Get the file path of the document.
     * @throws {Error} if the document is not set
     */
    getFilePath(): string;
}

export interface WorkspaceOutPort {
    /**
     * Get the workspace path.
     * @throws {Error} if the workspace is not set
     */
    getWorkspacePath(): string;
}

export interface VsCodeReadOutPort {
    readDirectory(path: string): Promise<[string, "file" | "directory"][]>;

    readFile(path: string): Promise<string>;
}

export interface ReadMiranumJsonOutPort {
    /**
     * Reads the `miranum.json` file from the workspace.
     * @param path is the path to the open file without the file name
     * @returns "workspace" if the `miranum.json` file is found in the workspace
     * @returns "default" if the `miranum.json` file is not found in the workspace and the default
     * configuration is used
     * ```typescript
     * const defaultMiranumWorkspaceItems: MiranumWorkspaceItem[] = [
     *   {
     *     type: "element-template",
     *     path: "element-templates",
     *     extension: ".json",
     *   },
     *   {
     *     type: "form",
     *     path: "forms",
     *     extension: ".form",
     *   },
     * ];
     * ```
     * @throws {SyntaxError} if the `miranum.json` file is not a valid JSON
     */
    readMiranumJson(path: string): Promise<"workspace" | "default">;
}

export interface ReadElementTemplatesOutPort {
    /**
     * Reads the element templates from the path configured in `miranum.json`.
     * @returns {Array<string>} of element templates
     * @throws {NoMiranumConfigFoundError} if the `miranum.json` file does not contain
     * an item with the type `element-template`
     */
    readElementTemplates(): Promise<string[]>;
}

export interface ReadFormKeysOutPort {
    /**
     * Reads the form keys from the path configured in `miranum.json`.
     * @returns {Array<string>} of form keys
     * @throws {NoMiranumConfigFoundError} if the `miranum.json` file does not contain
     * an item with the type `form`
     */
    readFormKeys(): Promise<string[]>;
}

export interface ShowMessageOutPort {
    showInfoMessage(message: string): void;

    showErrorMessage(message: string): void;
}
