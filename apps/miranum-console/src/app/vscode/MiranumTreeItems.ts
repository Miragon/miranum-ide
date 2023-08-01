import {
    Command,
    FileType,
    ThemeIcon,
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
} from "vscode";
import { TreeItemType } from "./types";

export class FolderItem extends TreeItem {
    /**
     * @override
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    public readonly label: string;

    /**
     * @override
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    public readonly collapsibleState: TreeItemCollapsibleState;

    /**
     * The URI of the directory or file.
     */
    public readonly itemPath: Uri;

    /**
     * Identifies either a folder or file
     */
    public readonly fileType: FileType;

    /**
     * An expandable tree item for which commands are registered.
     */
    public readonly executable: boolean;

    constructor(
        label: string,
        itemPath: Uri,
        fileType: FileType,
        executable: boolean,
        command?: Command,
    ) {
        if (fileType === FileType.Directory) {
            super(label, TreeItemCollapsibleState.Collapsed);
            this.collapsibleState = TreeItemCollapsibleState.Collapsed;
        } else {
            if (executable) {
                super(label, TreeItemCollapsibleState.Collapsed);
                this.collapsibleState = TreeItemCollapsibleState.Collapsed;
            } else {
                super(label, TreeItemCollapsibleState.None);
                this.collapsibleState = TreeItemCollapsibleState.None;
            }
        }

        this.label = label;
        this.command = command;

        if (fileType === FileType.File) {
            this.resourceUri = itemPath;
            this.iconPath = ThemeIcon.File;
        }

        this.contextValue = this.setContextValue(fileType);

        this.itemPath = itemPath;
        this.fileType = fileType;
        this.executable = executable;
    }

    private setContextValue(fileType: FileType): string {
        if (fileType === FileType.Directory) {
            return "treeItemFolder";
        } else if (fileType === FileType.File) {
            return "treeItemFile";
        }
        return "treeItem";
    }
}

export class MiranumCommand extends TreeItem {
    /**
     * @override
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    public readonly label: string;

    /**
     * @override
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    public readonly collapsibleState: TreeItemCollapsibleState;

    /**
     * Specifies the type of the tree item. Required for the displayed symbol.
     */
    public readonly type: TreeItemType;

    /**
     * The URI of a directory or file. Required as a parameter for the command.
     */
    public readonly itemPath: Uri;

    constructor(
        type: TreeItemType,
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        itemPath: Uri,
        extensionPath: Uri,
        command?: Command,
    ) {
        super(label, collapsibleState);

        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;

        switch (type) {
            case TreeItemType.DEPLOY: {
                this.iconPath = {
                    light: Uri.joinPath(
                        extensionPath,
                        "assets",
                        "icons",
                        "deploy_light.png",
                    ),
                    dark: Uri.joinPath(
                        extensionPath,
                        "assets",
                        "icons",
                        "deploy_dark.png",
                    ),
                };
                break;
            }
            default: {
                this.iconPath = new ThemeIcon("terminal-view-icon");
            }
        }

        this.type = type;
        this.itemPath = itemPath;
    }
}
