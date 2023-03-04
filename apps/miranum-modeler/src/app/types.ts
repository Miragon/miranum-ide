export interface VscMessage {
    type: string;
    content: string;
}

export interface VscState {
    bpmn: string;
    files: string;
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
    "updateFromExtension" = "updateFromExtension",
    "updateFromWebview" = "updateFromWebview",
    "undo" = "undo",
    "redo" = "redo",
    "reloadFiles" = "reloadFiles",
    "info" = "info",
    "error" = "error",
}
