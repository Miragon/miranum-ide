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
    MSGFROMEXTENSION = "msgFromExtension",
    MSGFROMWEBVIEW = "msgFromWebview",
    UNDO = "undo",
    REDO = "redo",
    RELOADFILES = "reloadFiles",
    INFO = "info",
    ERROR = "error",
}

export interface FolderContent {
    type: string;
    files: JSON[] | string[];
}
