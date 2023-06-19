import * as vscode from "vscode";
import {
    FileType,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
    WorkspaceFolder,
} from "vscode";
import { FolderItem, MiranumCommand } from "./MiranumTreeItems";
import { miranumCommands, TreeItemType } from "./types";

export class MiranumTreeDataProvider implements TreeDataProvider<TreeItem> {
    private readonly extensionUri: Uri;

    private readonly workspace?: WorkspaceFolder;

    private _onDidChangeTreeData: vscode.EventEmitter<
    FolderItem | undefined | null | void
    > = new vscode.EventEmitter<FolderItem | undefined | null | void>();

    readonly onDidChangeTreeData: vscode.Event<FolderItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor(extensionUri: Uri, workspace?: WorkspaceFolder) {
        this.extensionUri = extensionUri;
        this.workspace = workspace;

        // register commands
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

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: FolderItem): Thenable<TreeItem[]> {
        if (!this.workspace) {
            vscode.window.showInformationMessage("No workspace open!");
            return Promise.resolve([]);
        }

        if (element) {
            if (element instanceof MiranumCommand) {
                return Promise.resolve(
                    this.getCommands(element.label, element.itemPath),
                );
            }

            if (element.fileType === FileType.Directory) {
                return Promise.resolve(
                    this.getTreeItems(
                        Uri.joinPath(this.workspace.uri, element.label),
                        FileType.Directory,
                    ),
                );
            } else {
                return Promise.resolve(
                    this.getTreeItems(
                        Uri.joinPath(this.workspace.uri, element.label),
                        FileType.File,
                    ),
                );
            }
        } else {
            return Promise.resolve(
                this.getTreeItems(Uri.joinPath(this.workspace.uri), FileType.Directory),
            );
        }
    }

    getTreeItem(element: FolderItem): TreeItem | Thenable<TreeItem> {
        return element;
    }

    private async getTreeItems(path: Uri, fileType: FileType): Promise<TreeItem[]> {
        if (!this.workspace) {
            // TODO: Log error
            throw Error("No workspace is open!");
        }

        let treeItems: TreeItem[] = [];

        if (fileType === FileType.Directory) {
            treeItems = await this.getFolderItems(path);
        }

        // Create container for commands
        if (fileType === FileType.Directory) {
            treeItems.push(
                new MiranumCommand(
                    TreeItemType.DEFAULT,
                    "Deploy All",
                    TreeItemCollapsibleState.Collapsed,
                    path,
                    this.extensionUri,
                ),
            );
        } else if (fileType === FileType.File) {
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

    private async getFolderItems(path: Uri): Promise<FolderItem[]> {
        const folderItems: FolderItem[] = [];

        let directoryContent: [string, FileType][] =
            await vscode.workspace.fs.readDirectory(path);

        directoryContent = directoryContent.sort((a, b) => {
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

        for (const item of directoryContent) {
            const itemUri = Uri.joinPath(path, item[0]);
            switch (item[1]) {
                case FileType.Directory: {
                    folderItems.push(
                        new FolderItem(
                            item[0],
                            itemUri,
                            FileType.Directory,
                            this.getExecutable(FileType.Directory, itemUri.fsPath),
                        ),
                    );
                    break;
                }
                case FileType.File: {
                    folderItems.push(
                        new FolderItem(
                            item[0],
                            itemUri,
                            FileType.File,
                            this.getExecutable(FileType.File, itemUri.fsPath),
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

        // FIXME: Use Logger and better error message
        if (!commandList) throw Error("Invalid Command");

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

    private getExecutable(fileType: FileType, path: string): boolean {
        if (fileType === FileType.Directory) {
            return true;
        } else if (fileType === FileType.File) {
            const segments = path.split(".");
            const ext = segments[segments.length - 1];
            switch (ext) {
                case "bpmn":
                case "dmn":
                case "config.json":
                case "form":
                    return true;
                default:
                    return false;
            }
        }

        return false;
    }
}
