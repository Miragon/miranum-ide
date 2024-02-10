export interface SendToBpmnModelerOutPort {
    sendBpmnFile(executionPlatform: string, bpmnFile: string): Promise<boolean>;

    sendElementTemplates(elementTemplates: string[]): Promise<boolean>;

    sendFormKeys(formKeys: string[]): Promise<boolean>;
}

export interface SendToDmnModelerOutPort {
    sendDmnFile(dmnFile: string): Promise<boolean>;
}

export interface DocumentOutPort {
    getWorkspacePath(): string;

    getContent(): string;
}

export interface ReadMiranumJsonOutPort {
    readMiranumJson(path: string): Promise<string>;
}

export interface ReadElementTemplatesOutPort {
    readElementTemplates(path: string): Promise<string[]>;
}

export interface ReadDigiWfFormKeysOutPort {
    readFormKeys(path: string): Promise<string[]>;
}
