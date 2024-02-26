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

export interface VsCodeReadOutPort {
    readDirectory(path: string): Promise<[string, "file" | "directory"][]>;

    readFile(path: string): Promise<string>;
}

export interface ShowMessageOutPort {
    showInfoMessage(message: string): void;

    showErrorMessage(message: string): void;
}
