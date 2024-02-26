import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

export interface DisplayBpmnModelerInPort {
    displayBpmnFile(): Promise<boolean>;
}

export interface DisplayFormKeysInPort {
    sendFormKeys(): Promise<boolean>;
}

export interface DisplayElementTemplatesInPort {
    sendElementTemplates(): Promise<boolean>;
}

export interface DisplayDmnModelerInPort {
    displayDmnFile(): Promise<boolean>;
}

export interface SyncDocumentInPort {
    syncDocument(): boolean;
}

export interface SyncWebviewInPort {
    syncWebview(): boolean;
}

export interface RestoreBpmnModelerInPort {
    restoreBpmnModeler(): Promise<void>;
}

export interface RestoreDmnModelerInPort {
    restoreDmnModeler(): Promise<void>;
}

export interface GetMiranumConfigInPort {
    /**
     * Get one or multiple `miranum.json` for the given document.
     * @param documentPath
     * @returns {Promise} that resolves to an {@link Array} of paths
     * @throws {NoWorkspaceFolderFoundError} if the document is not in a workspace
     * @throws {NoMiranumConfigFoundError} if no `miranum.json` file is found
     */
    getMiranumConfig(documentPath: string): Promise<string>;
}

export interface GetWorkspaceItemInPort {
    // TODO: Should dependencies to the core be allowed?
    /**
     * Read the given `miranum.json` file and return the MiranumWorkspaceItem {@link MiranumWorkspaceItem} for the given type.
     * @param miranumConfigPath
     * @param type
     * @returns {Promise} that resolves to the {@link MiranumWorkspaceItem}
     * @throws {FileNotFound} if the `miranum.json` file does not exist
     * @throws {SyntaxError} if the `miranum.json` file is not valid JSON
     * @throws {NoMiranumWorkspaceItemError} if for the given type no configuration is found
     */
    getWorkspaceItemByType(
        miranumConfigPath: string,
        type: string,
    ): Promise<MiranumWorkspaceItem>;

    getDefaultWorkspaceItemByType(type: string): MiranumWorkspaceItem;
}
