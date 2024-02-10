export interface SendToBpmnModelerInPort {
    sendBpmnFile(): Promise<boolean>;

    sendFormKeys(): Promise<boolean>;

    sendElementTemplates(): Promise<boolean>;
}

export interface SendToDmnModelerInPort {
    sendDmnFile(): Promise<boolean>;
}

export interface SyncDocumentInPort {
    syncDocument(): boolean;
}

export interface SyncWebviewInPort {
    syncWebview(): boolean;
}

export interface RestoreBpmnModelerInPort {
    restoreBpmnModeler(): Promise<void>;
}

export interface RestoreDmnModelerInPort {
    restoreDmnModeler(): Promise<void>;
}
