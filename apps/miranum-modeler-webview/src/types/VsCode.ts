export interface VscMessage {
    type: string;
    content: any;
}

export interface VscState {
    bpmn?: string;
    files?: string;
}

export interface FolderContent {
    type: string,
    files: JSON[] | string[]
}

export interface WorkspaceFolder {
    type: string;
    path: string;
    extension: string;
}

export enum MessageType {
    "initialize" = "initialize",
    "updateFromExtension" = "updateFromExtension",
    "updateFromWebview" = "updateFromWebview",
    "undo" = "undo",
    "redo" = "redo",
    "reloadFiles" = "reloadFiles",
    "info" = "info",
    "error" = "error",
}
