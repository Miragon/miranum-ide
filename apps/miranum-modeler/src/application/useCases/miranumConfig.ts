import { GetMiranumConfigInPort, GetWorkspaceItemInPort } from "../ports/in";
import { MiranumConfig, MiranumWorkspaceItem } from "@miranum-ide/miranum-core";
import { inject, singleton } from "tsyringe";
import { VsCodeReadOutPort, WorkspaceOutPort } from "../ports/out";
import { NoMiranumConfigFoundError, NoMiranumWorkspaceItemError } from "../errors";

@singleton()
export class GetMiranumConfigUseCase implements GetMiranumConfigInPort {
    constructor(
        @inject("WorkspaceOutPort")
        private readonly workspaceOutPort: WorkspaceOutPort,
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
    ) {}

    async getMiranumConfig(documentPath: string): Promise<string> {
        const workspaceFolders =
            this.workspaceOutPort.getWorkspaceFoldersWithMiranumConfig();
        const workspaceFolderForDocument =
            this.workspaceOutPort.getWorkspaceFolderForDocument(documentPath);

        const ws = (await workspaceFolders).find(
            (folder) => folder === workspaceFolderForDocument,
        );

        if (!ws) {
            // undefined = document is in a workspace without any miranum.json
            throw new NoMiranumConfigFoundError();
        }

        // Since we only want the config files in the same or parent directories
        // of the document, we don't need to search the whole workspace.
        const files = await this.searchMiranumConfig(ws, documentPath);

        switch (files.length) {
            case 0:
                throw new NoMiranumConfigFoundError();
            case 1:
                return files[0];
            default:
                // FIXME: What to do if there are multiple miranum.json files?
                //  - User select one
                //  - The files get merged into one valid miranum.json
                //     Which one has priority?
                return files[0];
        }
    }

    private async searchMiranumConfig(
        rootDir: string,
        searchDir: string,
    ): Promise<string[]> {
        if (!searchDir.includes(rootDir)) {
            return [];
        }

        const getConfig = async (dir: string): Promise<string | undefined> => {
            const files = await this.vsCodeReadOutPort.readDirectory(dir);
            if (
                files.find(([name, type]) => name === "miranum.json" && type === "file")
            ) {
                return dir + "/miranum.json";
            }
            return undefined;
        };

        if (searchDir === rootDir) {
            const config = await getConfig(rootDir);
            if (config) {
                return [config];
            }
            return [];
        }

        const configs: string[] = [];
        const config = await getConfig(searchDir);
        if (config) {
            configs.push(config);
        }

        configs.push(
            ...(
                await this.searchMiranumConfig(
                    rootDir,
                    searchDir.split("/").slice(0, -1).join("/"),
                )
            )[0],
        );

        return configs;
    }
}

@singleton()
export class GetWorkspaceItemUseCase implements GetWorkspaceItemInPort {
    constructor(
        @inject("WorkspaceOutPort")
        private readonly workspaceOutPort: WorkspaceOutPort,
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
    ) {}

    async getWorkspaceItemByType(
        miranumConfigPath: string,
        type: string,
    ): Promise<MiranumWorkspaceItem> {
        const miranumConfig: MiranumConfig = JSON.parse(
            await this.vsCodeReadOutPort.readFile(miranumConfigPath),
        );
        const workspaceItem = miranumConfig.workspace.find((item) => item.type === type);

        if (!workspaceItem) {
            throw new NoMiranumWorkspaceItemError(type);
        }

        return workspaceItem;
    }

    getDefaultWorkspaceItemByType(type: string): MiranumWorkspaceItem {
        switch (type) {
            case "form":
                return {
                    type: "form",
                    path: "forms",
                    extension: ".form",
                };
            case "element-template":
                return {
                    type: "element-template",
                    path: "element-templates",
                    extension: ".json",
                };
            default: {
                throw new Error(`Unknown type: ${type}`);
            }
        }
    }
}
