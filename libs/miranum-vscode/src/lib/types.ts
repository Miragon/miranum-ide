export interface WorkspaceFolder {
    type: string;
    path: string;
    extension: string;
}

export interface FolderContent {
    type: string;
    files: JSON[] | string[];
}

export interface VscMessage<T> {
    type: string;
    data?: T;
    message?: string;
}

export interface VscState<T> {
    data?: T;
}

export enum MessageType {
    INITIALIZE = "initialize",
    RESTORE = "restore",
    UPDATEFROMEXTENSION = "updateFromExtension",
    UPDATEFROMWEBVIEW = "updateFromWebview",
    UNDO = "undo",
    REDO = "redo",
    RELOADFILES = "reloadFiles",
    INFO = "info",
    ERROR = "error",
}
