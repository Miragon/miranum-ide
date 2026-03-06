import { posix } from "path";

import { Disposable, RelativePattern, workspace } from "vscode";

import { MiranumConfig, MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

import {
    FileNotFound,
    NoMiranumConfigFoundError,
    NoMiranumWorkspaceItemError,
    NoWorkspaceFolderFoundError,
    UnableToCreateWatcherError,
} from "../domain/errors";
import { VsCodeWorkspace } from "../infrastructure/VsCodeWorkspace";
import { VsCodeUI } from "../infrastructure/VsCodeUI";

/**
 * Minimal interface implemented by {@link BpmnModelerService} and accepted by
 * {@link ArtifactService.createWatcher} to avoid a circular module import.
 */
export interface ArtifactChangeTarget {
    /**
     * Re-sends the current set of element templates to the webview for the given editor.
     * @param editorId Document URI path of the target editor.
     */
    setElementTemplates(editorId: string): Promise<boolean>;
}

/**
 * Result of creating watchers: the disposables to track and any errors.
 */
export interface WatcherResult {
    /** Disposables for the created file system watchers. */
    disposables: Disposable[];
    /** Errors that occurred while creating individual watchers. */
    errors: Error[];
}

/**
 * Application service responsible for locating workspace artifacts
 * (forms, element templates) and maintaining filesystem watchers for them.
 *
 * Absorbs the logic from `GetMiranumConfigUseCase`, `GetWorkspaceItemUseCase`,
 * the `GetArtifact` base class, and `VsCodeArtifactWatcherAdapter`.
 */
export class ArtifactService {
    private readonly artifactTypes = ["element-template"];

    /**
     * @param vsWorkspace Infrastructure helper for workspace/filesystem access.
     * @param vsUI Infrastructure helper for user messages and logging.
     */
    constructor(
        private readonly vsWorkspace: VsCodeWorkspace,
        private readonly vsUI: VsCodeUI,
    ) {}

    // ─── Miranum config discovery ─────────────────────────────────────────────

    /**
     * Locates the nearest `miranum.json` file for the given document directory.
     *
     * Searches upward from `documentDir` through the workspace root.  Returns
     * `undefined` if no `miranum.json` can be found (the caller should then use
     * default workspace paths).
     *
     * @param documentDir Directory containing the open document.
     * @returns Absolute path to the nearest `miranum.json`, or `undefined`.
     */
    async getMiranumConfigPath(documentDir: string): Promise<string | undefined> {
        try {
            const workspaceFolders =
                this.vsWorkspace.getWorkspaceFoldersWithMiranumConfig();
            const workspaceFolderForDocument =
                this.vsWorkspace.getWorkspaceFolderForDocument(documentDir);

            const ws = (await workspaceFolders).find(
                (folder) => folder === workspaceFolderForDocument,
            );

            if (!ws) {
                throw new NoMiranumConfigFoundError();
            }

            const files = await this.searchMiranumConfig(ws, documentDir);

            if (files.length === 0) {
                throw new NoMiranumConfigFoundError();
            }
            return files[0];
        } catch (error) {
            if (error instanceof NoWorkspaceFolderFoundError) {
                return documentDir;
            }
            return undefined;
        }
    }

    // ─── Workspace item resolution ────────────────────────────────────────────

    /**
     * Reads the `miranum.json` at `miranumConfigPath` and returns the
     * {@link MiranumWorkspaceItem} entry for `type`.
     *
     * Falls back to the default workspace item if the config is missing,
     * malformed, or has no entry for the requested type.  An info message is
     * shown to the user for each fallback case.
     *
     * @param miranumConfigPath Absolute path to `miranum.json`, or `undefined`.
     * @param type Artifact type key, e.g. `"form"` or `"element-template"`.
     * @returns The resolved {@link MiranumWorkspaceItem}.
     */
    async getWorkspaceItem(
        miranumConfigPath: string | undefined,
        type: string,
    ): Promise<MiranumWorkspaceItem> {
        if (!miranumConfigPath) {
            return this.getDefaultWorkspaceItem(type);
        }

        try {
            return await this.getWorkspaceItemByType(miranumConfigPath, type);
        } catch (error) {
            const root = posix.dirname(miranumConfigPath);
            const defaultMessage = `Default workspace is used. You can save element templates in \`${root}/element-templates\` and forms in \`${root}/forms\``;

            if (error instanceof FileNotFound) {
                this.vsUI.showInfo(
                    `The \`miranum.json\` file is missing!\n${defaultMessage}.`,
                );
            } else if (error instanceof SyntaxError) {
                this.vsUI.showInfo(
                    `The \`miranum.json\` file has incorrect JSON!\n${defaultMessage}.`,
                );
            } else if (error instanceof NoMiranumWorkspaceItemError) {
                this.vsUI.showInfo(`${(error as Error).message}!\n${defaultMessage}.`);
            } else {
                this.vsUI.showInfo(
                    `${(error as Error).message}!\n${defaultMessage}.`,
                );
            }
            return this.getDefaultWorkspaceItem(type);
        }
    }

    /**
     * Returns the default {@link MiranumWorkspaceItem} for a given artifact type.
     *
     * @param type Artifact type key.
     * @returns The default workspace item configuration.
     * @throws {Error} If the type is not recognised.
     */
    getDefaultWorkspaceItem(type: string): MiranumWorkspaceItem {
        switch (type) {
            case "element-template":
                return {
                    type: "element-template",
                    path: ".camunda/element-templates",
                    extension: ".json",
                };
            default:
                throw new Error(`Unknown artifact type: ${type}`);
        }
    }

    // ─── Artifact path enumeration ────────────────────────────────────────────

    /**
     * Returns the file paths and extension for all artifacts of the given type
     * relative to the document directory.
     *
     * @param documentDir Directory of the open document.
     * @param type Artifact type key (e.g. `"form"`).
     * @returns A tuple of `[absoluteFilePaths[], extension]`.
     */
    async getArtifactPaths(
        documentDir: string,
        type: string,
    ): Promise<[string[], string]> {
        const miranumConfigPath = await this.getMiranumConfigPath(documentDir);
        const workspaceItem = await this.getWorkspaceItem(miranumConfigPath, type);

        const searchDir = miranumConfigPath
            ? posix.join(posix.dirname(miranumConfigPath), workspaceItem.path)
            : `${documentDir}/${workspaceItem.path}`;

        return [
            await this.readDirectory(searchDir, workspaceItem.extension),
            workspaceItem.extension,
        ];
    }

    /**
     * Reads a file and returns its content as a UTF-8 string.
     *
     * @param path Absolute path to the file.
     */
    readFile(path: string): Promise<string> {
        return this.vsWorkspace.readFile(path);
    }

    // ─── Filesystem watcher ───────────────────────────────────────────────────

    /**
     * Creates a {@link FileSystemWatcher} for each artifact type tied to the
     * given editor.  When an artifact file is created, changed, or deleted, the
     * corresponding method on `target` is called to refresh the webview.
     *
     * The `target` is passed as a method parameter (rather than a constructor
     * argument) to break the `BpmnModelerService ↔ ArtifactService` circular
     * dependency.
     *
     * @param editorId Document URI path of the BPMN editor.
     * @param target Service that exposes `setElementTemplates`.
     * @returns Disposables for created watchers and any errors that occurred.
     */
    async createWatcher(
        editorId: string,
        target: ArtifactChangeTarget,
    ): Promise<WatcherResult> {
        const documentDir = posix.dirname(editorId);
        const miranumConfigPath = await this.getMiranumConfigPath(documentDir);

        const errors: Error[] = [];
        const disposables: Disposable[] = [];

        for (const type of this.artifactTypes) {
            const workspaceItem = await this.safeGetWorkspaceItem(
                miranumConfigPath,
                type,
            );

            if (!workspaceItem) {
                errors.push(
                    new UnableToCreateWatcherError(
                        editorId,
                        `No workspace item found for type: ${type}`,
                    ),
                );
                continue;
            }

            const pathToWatch = miranumConfigPath
                ? posix.join(posix.dirname(miranumConfigPath), workspaceItem.path)
                : documentDir;

            const watcher = workspace.createFileSystemWatcher(
                new RelativePattern(
                    pathToWatch,
                    `**/*${workspaceItem.extension}`,
                ),
            );

            watcher.onDidCreate(() => target.setElementTemplates(editorId));
            watcher.onDidChange(() => target.setElementTemplates(editorId));
            watcher.onDidDelete(() => target.setElementTemplates(editorId));

            disposables.push(watcher);
        }

        return { disposables, errors };
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Recursively lists all files with the given extension under `folder`.
     *
     * @param folder Absolute path to the directory to search.
     * @param extension File extension filter (e.g. `".form"`).
     * @returns Absolute paths of all matching files.
     */
    async readDirectory(folder: string, extension: string): Promise<string[]> {
        const entries = await this.vsWorkspace.readDirectory(folder);

        const files: string[] = [];
        for (const [name, type] of entries) {
            if (type === "directory") {
                files.push(...(await this.readDirectory(`${folder}/${name}`, extension)));
            } else if (type === "file" && name.endsWith(extension)) {
                files.push(`${folder}/${name}`);
            }
        }
        return files;
    }

    /**
     * Reads and parses a `miranum.json` file and returns the workspace item for
     * the given type.
     *
     * @param miranumConfigPath Absolute path to the `miranum.json` file.
     * @param type Artifact type key.
     * @throws {FileNotFound} If the file cannot be read.
     * @throws {SyntaxError} If the file is not valid JSON.
     * @throws {NoMiranumWorkspaceItemError} If no entry exists for the type.
     */
    private async getWorkspaceItemByType(
        miranumConfigPath: string,
        type: string,
    ): Promise<MiranumWorkspaceItem> {
        const miranumConfig: MiranumConfig = JSON.parse(
            await this.vsWorkspace.readFile(miranumConfigPath),
        );

        const workspaceItem = miranumConfig.workspace.find(
            (item) => item.type === type,
        );

        if (!workspaceItem) {
            throw new NoMiranumWorkspaceItemError(type);
        }

        return workspaceItem;
    }

    /**
     * Like {@link getWorkspaceItem} but returns the default on any error
     * instead of prompting the user.  Used only by {@link createWatcher}.
     *
     * @param miranumConfigPath Absolute path to `miranum.json`, or `undefined`.
     * @param type Artifact type key.
     */
    private async safeGetWorkspaceItem(
        miranumConfigPath: string | undefined,
        type: string,
    ): Promise<MiranumWorkspaceItem | undefined> {
        if (!miranumConfigPath) {
            return this.getDefaultWorkspaceItem(type);
        }
        try {
            return await this.getWorkspaceItemByType(miranumConfigPath, type);
        } catch (error) {
            this.vsUI.logInfo(
                `The default workspace item for type ${type} will be used. Reason: ${(error as Error).message}`,
            );
            return this.getDefaultWorkspaceItem(type);
        }
    }

    /**
     * Recursively searches for `miranum.json` files from `searchDir` up to
     * `rootDir`, returning paths ordered nearest-first.
     *
     * @param rootDir The workspace root to stop the search at.
     * @param searchDir The directory to start from.
     */
    private async searchMiranumConfig(
        rootDir: string,
        searchDir: string,
    ): Promise<string[]> {
        if (!searchDir.includes(rootDir)) {
            return [];
        }

        const getConfig = async (dir: string): Promise<string | undefined> => {
            const files = await this.vsWorkspace.readDirectory(dir);
            if (
                files.find(([name, type]) => name === "miranum.json" && type === "file")
            ) {
                return `${dir}/miranum.json`;
            }
            return undefined;
        };

        if (searchDir === rootDir) {
            const config = await getConfig(rootDir);
            return config ? [config] : [];
        }

        const configs: string[] = [];
        const config = await getConfig(searchDir);
        if (config) {
            configs.push(config);
        }

        configs.push(
            ...(await this.searchMiranumConfig(
                rootDir,
                posix.dirname(searchDir),
            )),
        );

        return configs;
    }
}
