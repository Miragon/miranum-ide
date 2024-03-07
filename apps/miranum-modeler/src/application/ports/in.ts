import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

export interface DisplayModelerInPort {
    display(editorId: string): Promise<boolean>;
}

export interface SetArtifactInPort {
    set(editorId: string): Promise<boolean>;
}

export interface SetModelerSettingInPort {
    set(editorId: string): Promise<boolean>;
}

export interface SyncDocumentInPort {
    sync(editorId: string, content: string): Promise<boolean>;
}

export interface GetMiranumConfigInPort {
    /**
     * Get one or multiple `miranum.json` for the given document.
     * @param documentDir
     * @returns {Promise} that resolves to an {@link Array} of paths
     * @throws {NoWorkspaceFolderFoundError} if the document is not in a workspace
     * @throws {NoMiranumConfigFoundError} if no `miranum.json` file is found
     */
    get(documentDir: string): Promise<string>;
}

export interface GetWorkspaceItemInPort {
    // TODO: Should dependencies to the core be allowed?
    /**
     * Read the given `miranum.json` file and return the MiranumWorkspaceItem {@link MiranumWorkspaceItem} for the given type.
     * @param path the path to the `miranum.json` file
     * @param type e.g., `form`, `element-template`
     * @returns {Promise} that resolves to the {@link MiranumWorkspaceItem}
     * @throws {FileNotFound} if the `miranum.json` file does not exist
     * @throws {SyntaxError} if the `miranum.json` file is not valid JSON
     * @throws {NoMiranumWorkspaceItemError} if for the given type no configuration is found
     */
    getByType(path: string, type: string): Promise<MiranumWorkspaceItem>;

    getDefaultByType(type: string): MiranumWorkspaceItem;
}

export interface GetDocumentInPort {
    getPath(): string;
}

export interface ShowMessageInPort {
    info(message: string): void;

    error(message: string): void;
}

export interface ToggleTextEditorInPort {
    toggle(): Promise<boolean>;
}

export interface ShowLoggerInPort {
    show(): void;
}

export interface LogMessageInPort {
    info(message: string): void;

    error(error: Error): void;
}
