export interface DisplayBpmnModelerInPort {
    displayBpmnFile(): Promise<boolean>;
}

export interface DisplayBpmnModelerArtifactInPort {
    sendFormKeys(): Promise<boolean>;

    sendElementTemplates(): Promise<boolean>;
}

export interface DisplayDmnModelerInPort {
    displayDmnFile(): Promise<boolean>;
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
