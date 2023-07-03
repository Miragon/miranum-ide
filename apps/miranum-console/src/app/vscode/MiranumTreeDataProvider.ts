import * as vscode from "vscode";
import {
    FileType,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
    WorkspaceFolder,
} from "vscode";
import { checkIfSupportedType, MiranumCore } from "@miranum-ide/miranum-core";
import { FolderItem, MiranumCommand } from "./MiranumTreeItems";
import { miranumCommands, TreeItemType } from "./types";
import { Logger } from "@miranum-ide/vscode/miranum-vscode";

export class MiranumTreeDataProvider implements TreeDataProvider<TreeItem> {
    private readonly extensionUri: Uri;

    private readonly miranumCore: MiranumCore;

    private readonly workspace?: WorkspaceFolder;

    private _onDidChangeTreeData: vscode.EventEmitter<
    FolderItem | undefined | null | void
    > = new vscode.EventEmitter<FolderItem | undefined | null | void>();

    readonly onDidChangeTreeData: vscode.Event<FolderItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor(
        extensionUri: Uri,
        miranumCore: MiranumCore,
        workspace?: WorkspaceFolder,
    ) {
        this.extensionUri = extensionUri;
        this.miranumCore = miranumCore;
        this.workspace = workspace;

        this.registerTreeViewCommands();
        this.registerEventHandler();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: FolderItem): Thenable<TreeItem[]> {
        if (!this.workspace) {
            const errMsg = "[Miranum.Console] Please open a workspace!";
            vscode.window.showErrorMessage(errMsg);
            Logger.error(errMsg);
            throw Error(errMsg);
        }

        if (element) {
            // User expanded a command container
            if (element instanceof MiranumCommand) {
                return Promise.resolve(
                    this.getCommands(element.label, element.itemPath),
                );
            }

            // User expanded a directory
            if (element.fileType === FileType.Directory) {
                return Promise.resolve(
                    this.getTreeItems(element.itemPath, FileType.Directory),
                );
            } else {
                // User expanded a file
                return Promise.resolve(
                    this.getTreeItems(element.itemPath, FileType.File),
                );
            }
        } else {
            // User opened the custom view the first time
            return Promise.resolve(
                this.getTreeItems(Uri.joinPath(this.workspace.uri), FileType.Directory),
            );
        }
    }

    getTreeItem(element: FolderItem): TreeItem | Thenable<TreeItem> {
        return element;
    }

    private registerTreeViewCommands(): void {
        vscode.commands.registerCommand("miranum.treeView.openFile", (path: Uri) => {
            vscode.commands.executeCommand("vscode.open", path);
        });
        vscode.commands.registerCommand("miranum.treeView.delete", async (...args) => {
            const treeItem: FolderItem = args[0];
            if (treeItem.fileType === FileType.Directory) {
                await vscode.workspace.fs.delete(treeItem.itemPath, { recursive: true });
            } else if (treeItem.fileType === FileType.File) {
                await vscode.workspace.fs.delete(treeItem.itemPath, {
                    recursive: false,
                });
            }
            this.refresh();
        });
        vscode.commands.registerCommand("miranum.treeView.refresh", () => {
            this.refresh();
        });
    }

    private registerEventHandler(): void {
        // react on changes in explorer view
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.refresh();
        });
        vscode.workspace.onDidRenameFiles(() => {
            this.refresh();
        });
        vscode.workspace.onDidCreateFiles(() => {
            this.refresh();
        });
        vscode.workspace.onDidDeleteFiles(() => {
            this.refresh();
        });
    }

    /**
     * Create the TreeItems.
     * The following TreeItems exist:
     *   - FolderItem (Directory or File)
     *   - MiranumCommand (e.g. Deploy-Command)
     * @param path
     * @param fileType
     * @private
     */
    private async getTreeItems(path: Uri, fileType: FileType): Promise<TreeItem[]> {
        let treeItems: TreeItem[] = [];
        let dirContent: [string, FileType][] = [];

        // Get all items (file or directory) of the curren directory and create
        // the FolderItems
        if (fileType === FileType.Directory) {
            dirContent = await vscode.workspace.fs.readDirectory(path);
            treeItems = await this.getFolderItems(path, dirContent);
        }

        // Initialize container for commands
        if (fileType === FileType.Directory) {
            // TODO: This works only for the Deploy-Commands.
            //  If more commands are added in the future, a better architecture must be found.
            // Expandable container for "Deploy All"
            // The "Deploy All"-Option is only displayed if there is a deployable file
            let deployable = false;
            for (const item of dirContent.sort((a, b) => a[1] - b[1])) {
                if (item[1] === FileType.File) {
                    deployable = this.checkDeployable(item[0]);
                } else if (item[1] === FileType.Directory) {
                    deployable = await this.searchForDeployable(
                        Uri.joinPath(path, item[0]),
                    );
                }

                if (deployable) {
                    treeItems.push(
                        new MiranumCommand(
                            TreeItemType.DEFAULT,
                            "Deploy All",
                            TreeItemCollapsibleState.Collapsed,
                            path,
                            this.extensionUri,
                        ),
                    );
                    break;
                }
            }
        } else if (fileType === FileType.File && this.checkDeployable(path.path)) {
            // Expandable container for "Deploy"
            treeItems.push(
                new MiranumCommand(
                    TreeItemType.DEFAULT,
                    "Deploy",
                    TreeItemCollapsibleState.Collapsed,
                    path,
                    this.extensionUri,
                ),
            );
        }

        return treeItems;
    }

    private async getFolderItems(
        path: Uri,
        directoryContent: [string, FileType][],
    ): Promise<FolderItem[]> {
        const folderItems: FolderItem[] = [];

        const dirContent = directoryContent.sort((a, b) => {
            if (a[1] === b[1]) {
                // sort filenames alphabetically
                const filenameA = a[0].toLowerCase();
                const filenameB = b[0].toLowerCase();
                if (filenameA < filenameB) {
                    return -1;
                }
                if (filenameA > filenameB) {
                    return 1;
                }
            }
            // sort directories before files
            return b[1] - a[1];
        });

        for (const item of dirContent) {
            const itemUri = Uri.joinPath(path, item[0]);
            switch (item[1]) {
                case FileType.Directory: {
                    folderItems.push(
                        new FolderItem(item[0], itemUri, FileType.Directory, true),
                    );
                    break;
                }
                case FileType.File: {
                    folderItems.push(
                        new FolderItem(
                            item[0],
                            itemUri,
                            FileType.File,
                            this.checkDeployable(itemUri.fsPath),
                            {
                                arguments: [itemUri],
                                command: "miranum.treeView.openFile",
                                title: "Open",
                            },
                        ),
                    );
                    break;
                }
            }
        }
        return folderItems;
    }

    private async getCommands(id: string, path: Uri): Promise<MiranumCommand[]> {
        const commandList = miranumCommands.get(id);

        if (!commandList) {
            const errMsg = "[Miranum.Console] Invalid command!";
            Logger.error(errMsg);
            vscode.window.showErrorMessage(errMsg);
            throw Error(errMsg);
        }

        const commandItems: MiranumCommand[] = [];

        for (const [label, command] of commandList) {
            commandItems.push(
                new MiranumCommand(
                    TreeItemType.DEPLOY,
                    label,
                    TreeItemCollapsibleState.None,
                    path,
                    this.extensionUri,
                    {
                        arguments: [path],
                        command,
                        title: `${id} ${label}`,
                    },
                ),
            );
        }

        return commandItems;
    }

    /**
     * Search recursively for deployable files inside a given directory.
     * @private
     */
    private async searchForDeployable(path: Uri): Promise<boolean> {
        const items = (await vscode.workspace.fs.readDirectory(path)).sort((a, b) => {
            return a[1] - b[1];
        });

        for (const item of items) {
            if (item[1] === FileType.Directory) {
                return this.searchForDeployable(Uri.joinPath(path, item[0]));
            }
            if (this.checkDeployable(item[0])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a given file can be deployed.
     * @param filePath
     * @private
     */
    private checkDeployable(filePath: string): boolean {
        if (!this.miranumCore.projectConfig) {
            return false;
        }

        // Map file extension to artifact type
        const ext = this.getFileExtension(filePath);
        const item = this.miranumCore.projectConfig.workspace.find(
            (wsItem) => wsItem.extension === `.${ext}`,
        );

        if (item) {
            return checkIfSupportedType(item.type);
        }
        return false;
    }

    private getFileExtension(path: string): string {
        const segments = path.split(/\.(.*)/s);
        return segments[segments.length - 2];
    }
}
