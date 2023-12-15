export interface VscMessage<T> {
    type: string;
    data?: T;
    message?: string;
}

export interface VscState<T> {
    data?: T;
}

export enum MessageType {
    ALIGN = "align",
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

export class LoggerMessage {
    public readonly type: MessageType;

    public readonly log: string;

    constructor(type: MessageType, log: string) {
        if (!log) {
            throw new Error("Log message cannot be empty.");
        }

        this.type = type;
        this.log = log;
    }
}
