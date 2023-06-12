import * as vscode from "vscode";
import {
    Command,
    Event,
    EventEmitter,
    FileType,
    ThemeIcon,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
    WorkspaceFolder,
} from "vscode";

export class MiranumTreeDataProvider implements TreeDataProvider<Artifact> {
    private readonly workspace?: WorkspaceFolder;

    private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();

    readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;

    constructor(workspace?: WorkspaceFolder) {
        this.workspace = workspace;

        // register commands
        vscode.commands.registerCommand("miranum.treeView.openFile", (path: Uri) => {
            vscode.commands.executeCommand("vscode.open", path);
        });
        vscode.commands.registerCommand("miranum.treeView.delete", (...args) => {
            const treeItem: Artifact = args[0];
            if (treeItem.fileType === FileType.Directory) {
                vscode.workspace.fs.delete(treeItem.path, { recursive: true });
            } else if (treeItem.fileType === FileType.File) {
                vscode.workspace.fs.delete(treeItem.path, { recursive: false });
            }
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
        this._onDidChangeTreeData.fire(undefined);
    }

    getChildren(element?: Artifact): Thenable<Artifact[]> {
        if (!this.workspace) {
            vscode.window.showInformationMessage("No workspace open!");
            return Promise.resolve([]);
        }

        if (element) {
            return Promise.resolve(
                this.getArtifactsInProject(
                    Uri.joinPath(this.workspace.uri, element.label),
                ),
            );
        } else {
            return Promise.resolve(
                this.getArtifactsInProject(Uri.joinPath(this.workspace.uri)),
            );
        }
    }

    getTreeItem(element: Artifact): TreeItem | Thenable<TreeItem> {
        return element;
    }

    private async getArtifactsInProject(path: Uri): Promise<Artifact[]> {
        if (!this.workspace) {
            throw Error("No workspace is open!");
        }

        const artifacts: Artifact[] = [];
        let workspaceItems: [string, FileType][] =
            await vscode.workspace.fs.readDirectory(path);

        workspaceItems = workspaceItems.sort((a, b) => {
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
            // sort directories for files
            return b[1] - a[1];
        });

        for (const item of workspaceItems) {
            const itemUri = Uri.joinPath(path, item[0]);
            switch (item[1]) {
                case FileType.Directory: {
                    artifacts.push(
                        new Artifact(
                            item[0],
                            TreeItemCollapsibleState.Collapsed,
                            itemUri,
                            FileType.Directory,
                        ),
                    );
                    break;
                }
                case FileType.File: {
                    artifacts.push(
                        new Artifact(
                            item[0],
                            TreeItemCollapsibleState.None,
                            itemUri,
                            FileType.File,
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

        return artifacts;
    }
}

class Artifact extends TreeItem {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    public readonly label;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    public readonly collapsibleState: TreeItemCollapsibleState;

    private readonly _path: Uri;

    private readonly _fileType: FileType;

    constructor(
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        path: Uri,
        fileType: FileType,
        command?: Command,
    ) {
        super(label, collapsibleState);

        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = "treeItem";
        this.command = command;
        this.resourceUri = path;
        if (collapsibleState === TreeItemCollapsibleState.None) {
            this.iconPath = ThemeIcon.File;
        }

        this._path = path;
        this._fileType = fileType;
    }

    public get path(): Uri {
        return this._path;
    }

    public get fileType(): FileType {
        return this._fileType;
    }
}
