export interface FolderContent {
    type: string,
    files: JSON[] | string[]
}

export interface ModelerData {
    dmn?: string;
    additionalFiles?: FolderContent[];  // e.g element templates, forms
}

export interface VscMessage {
    type: string;
    data?: ModelerData;
    message?: string;
}

export interface VscState {
    data?: ModelerData;
}

export enum MessageType {
    "initialize" = "initialize",
    "restore" = "restore",
    "updateFromExtension" = "updateFromExtension",
    "updateFromWebview" = "updateFromWebview",
    "undo" = "undo",
    "redo" = "redo",
    "reloadFiles" = "reloadFiles",
    "info" = "info",
    "error" = "error",
}
