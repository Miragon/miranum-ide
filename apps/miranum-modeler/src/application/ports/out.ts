export interface ReadElementTemplateOutPort {
    readElementTemplates(path: string): string[];
}

export interface ReadFormKeysOutPort {
    readFormKeys(path: string): string[];
}

export interface SendToWebviewOutPort {
    sendBpmnFile(executionPlatform: string, bpmnFile: string): boolean;

    sendDmnFile(dmnFile: string): boolean;

    sendElementTemplates(elementTemplates: string[]): boolean;

    sendFormKeys(formKeys: string[]): boolean;
}

export interface DocumentOutPort {
    getWorkspacePath(): string;

    getContent(): string;
}
