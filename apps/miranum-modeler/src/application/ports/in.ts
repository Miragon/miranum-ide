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

export interface SetConfigInPort {
    setMiranumJson(setConfigCommand: FilePathCommand): Promise<void>;
}

export class FilePathCommand {
    private readonly _path: string;

    constructor(path: string) {
        this._path = this.validatePath(path);
    }

    get path(): string {
        return this._path;
    }

    private validatePath(path: string): string {
        const segments = path.split("/");
        const lastSegment = segments[segments.length - 1];
        if (lastSegment.includes(".")) {
            return segments.slice(0, -1).join("/");
        }
        return path;
    }
}
