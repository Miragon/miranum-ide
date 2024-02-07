export interface SendToWebviewInPort {
    sendBpmnFile(): boolean;

    sendDmnFile(): boolean;

    sendFormKeys(): boolean;

    sendElementTemplates(): boolean;
}

export interface SyncDocumentInPort {
    syncDocument(): boolean;
}

export interface SyncWebviewInPort {}

export interface RestoreWebviewInPort {}

export interface ReadVsCodeConfigInPort {}

export interface ReadJsonFormInPort {}
