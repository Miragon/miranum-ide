export interface VscMessage<T> {
    type: string;
    payload?: T;
    logger?: string; // if something should be logged in VSCode
}

export interface ConfigEditorData {
    schema?: string;
    uischema?: string;
    data?: string;
}

export enum MessageType {
    initialize = "initialize", // initialize the webview
    restore = "restore", // restore the webview
    syncWebview = "syncWebview", // user made changes in the document
    syncDocument = "syncDocument", // user made changes in the webview
    watcher = "watcher", // user made changes in schema or uischema
    info = "info",
    error = "error",
}
