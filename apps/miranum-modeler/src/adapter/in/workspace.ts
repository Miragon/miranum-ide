import { RelativePattern, workspace } from "vscode";
import { inject, singleton } from "tsyringe";

import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

import { addToDisposals } from "../out";
import {
    GetDocumentInPort,
    GetMiranumConfigInPort,
    GetWorkspaceItemInPort,
    LogMessageInPort,
    SetElementTemplatesInPort,
    SetFormKeysInPort,
} from "../../application/ports/in";
import {
    NoWorkspaceFolderFoundError,
    UnableToCreateWatcherError,
} from "../../application/errors";

@singleton()
export class VsCodeArtifactWatcherAdapter {
    private artifactTypes = ["form", "element-template"];

    /**
     * Create a {@link FileSystemWatcher} for each artifact type.
     * @param getDocumentUseCase
     * @param getMiranumConfigUseCase
     * @param getWorkspaceItemUseCase
     * @param setFormKeysInPort
     * @param setElementTemplatesInPort
     * @param logMessageInPort
     * @throws {UnableToCreateWatcherError} if a problem occurs while creating the watcher
     */
    constructor(
        @inject("GetDocumentInPort")
        private readonly getDocumentUseCase: GetDocumentInPort,
        @inject("GetMiranumConfigInPort")
        protected readonly getMiranumConfigUseCase: GetMiranumConfigInPort,
        @inject("GetWorkspaceItemInPort")
        protected readonly getWorkspaceItemUseCase: GetWorkspaceItemInPort,
        @inject("SetFormKeysInPort")
        private readonly setFormKeysInPort: SetFormKeysInPort,
        @inject("SetElementTemplatesInPort")
        private readonly setElementTemplatesInPort: SetElementTemplatesInPort,
        @inject("LogMessageInPort")
        private readonly logMessageInPort: LogMessageInPort,
    ) {}

    async create(id: string): Promise<Error[]> {
        const documentDir = id.split("/").slice(0, -1).join("/");
        const miranumConfigPath = await this.getMiranumConfig(documentDir);

        const errors: Error[] = [];

        for (const type of this.artifactTypes) {
            const workspaceItem = await this.getWorkspaceItem(miranumConfigPath, type);

            if (!workspaceItem) {
                errors.push(
                    new UnableToCreateWatcherError(
                        id,
                        `No workspace item found for type: ${type}`,
                    ),
                );
                continue;
            }

            const pathToWatch =
                miranumConfigPath?.replace("miranum.json", workspaceItem.path) ??
                documentDir;

            const watcher = workspace.createFileSystemWatcher(
                new RelativePattern(pathToWatch, `**/*${workspaceItem.extension}`),
            );

            switch (type) {
                case "form": {
                    watcher.onDidCreate(() => this.setFormKeysInPort.set(id));
                    watcher.onDidChange(() => this.setFormKeysInPort.set(id));
                    watcher.onDidDelete(() => this.setFormKeysInPort.set(id));
                    break;
                }
                case "element-template": {
                    watcher.onDidCreate(() => this.setElementTemplatesInPort.set(id));
                    watcher.onDidChange(() => this.setElementTemplatesInPort.set(id));
                    watcher.onDidDelete(() => this.setElementTemplatesInPort.set(id));
                    break;
                }
            }

            addToDisposals(id, watcher);
        }

        return errors;
    }

    private async getMiranumConfig(documentPath: string): Promise<string | undefined> {
        try {
            return await this.getMiranumConfigUseCase.get(documentPath);
        } catch (error) {
            if (error instanceof NoWorkspaceFolderFoundError) {
                return documentPath;
            }
            return undefined;
        }
    }

    private async getWorkspaceItem(
        miranumConfigPath: string | undefined,
        type: string,
    ): Promise<MiranumWorkspaceItem | undefined> {
        if (!miranumConfigPath) {
            return this.getWorkspaceItemUseCase.getDefaultByType(type);
        }

        try {
            return await this.getWorkspaceItemUseCase.getByType(miranumConfigPath, type);
        } catch (error) {
            this.logMessageInPort.info(
                `The default workspace item for type ${type} will be used.`,
            );
            return this.getWorkspaceItemUseCase.getDefaultByType(type);
        }
    }
}
