import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

export interface DisplayBpmnModelerInPort {
    display(editorId: string): Promise<boolean>;
}

export interface DisplayDmnModelerInPort {
    display(editorId: string): Promise<boolean>;
}

export interface SetFormKeysInPort {
    set(editorId: string): Promise<boolean>;
}

export interface SetElementTemplatesInPort {
    set(editorId: string): Promise<boolean>;
}

export interface SetBpmnModelerSettingsInPort {
    set(editorId: string): Promise<boolean>;
}

export interface SyncDocumentInPort {
    sync(editorId: string, content: string): Promise<boolean>;
}

export interface RestoreBpmnModelerInPort {
    restore(editorId: string): Promise<void>;
}

export interface RestoreDmnModelerInPort {
    restore(editorId: string): Promise<void>;
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
    get(): string;
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
