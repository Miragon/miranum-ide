export interface SendToBpmnModelerOutPort {
    sendBpmnFile(executionPlatform: string, bpmnFile: string): Promise<boolean>;

    sendElementTemplates(elementTemplates: string[]): Promise<boolean>;

    sendFormKeys(formKeys: string[]): Promise<boolean>;
}

export interface SendToDmnModelerOutPort {
    sendDmnFile(dmnFile: string): Promise<boolean>;
}

export interface DocumentOutPort {
    getWorkspacePath(): string;

    getContent(): string;
}

export interface MiranumWorkspaceOutPort {
    getWorkspace(): string;

    /**
     * Sets the workspace path.
     * @param path is the path to the opened file without the file name.
     */
    setWorkspace(path: string): void;
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
