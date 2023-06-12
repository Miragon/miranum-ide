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

        vscode.commands.registerCommand("miranum.treeView.openFile", (path: Uri) => {
            vscode.commands.executeCommand("vscode.open", path);
        });

        // Update tree view on workspace changes
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
        let files: [string, FileType][] = await vscode.workspace.fs.readDirectory(path);

        files = files.sort((a, b) => {
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

        for (const file of files) {
            switch (file[1]) {
                case FileType.Directory: {
                    artifacts.push(
                        new Artifact(file[0], TreeItemCollapsibleState.Collapsed),
                    );
                    break;
                }
                case FileType.File: {
                    const fileUri = Uri.joinPath(path, file[0]);
                    artifacts.push(
                        new Artifact(
                            file[0],
                            TreeItemCollapsibleState.None,
                            {
                                arguments: [fileUri],
                                command: "miranum.treeView.openFile",
                                title: "Open",
                            },
                            fileUri,
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

    constructor(
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        command?: Command,
        path?: Uri,
    ) {
        super(label, collapsibleState);

        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.resourceUri = path;

        if (collapsibleState === TreeItemCollapsibleState.None) {
            this.iconPath = ThemeIcon.File;
        }
    }
}
