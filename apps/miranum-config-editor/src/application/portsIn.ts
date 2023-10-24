/**
 * @module In-Ports
 * @description In-Ports are interfaces that are implemented by use cases. \
 * List of In-Ports:
 * - {@link InitWebviewInPort}
 * - {@link SyncWebviewInPort}
 * - {@link SyncDocumentInPort}
 * - {@link ReadVsCodeConfigInPort}
 * - {@link ReadJsonFormInPort}
 */

/**
 * @interface InitWebviewInPort
 * @description This interface is implemented by {@link InitWebviewUseCase}.
 */
export interface InitWebviewInPort {
    initWebview(initWebviewCommand: InitWebviewCommand): Promise<boolean>;
}

export class InitWebviewCommand {
    constructor(
        private readonly _webviewId: string,
        private readonly _jsonSchema: string,
        private readonly _jsonUiSchema: string,
        private readonly _content: string,
    ) {}

    public get webviewId(): string {
        return this._webviewId;
    }

    public get jsonSchema(): string {
        return this._jsonSchema;
    }

    public get jsonUiSchema(): string {
        return this._jsonUiSchema;
    }

    public get content(): string {
        return this._content;
    }
}

/**
 * @interface SyncWebviewInPort
 * @description This interface is implemented by {@link SyncWebviewUseCase}.
 */
export interface SyncWebviewInPort {
    sync(syncWebviewCommand: SyncWebviewCommand): Promise<boolean>;
}

export class SyncWebviewCommand {
    constructor(
        private readonly _webviewId: string,
        private readonly _content: string,
    ) {}

    public get webviewId(): string {
        return this._webviewId;
    }

    public get content(): string {
        return this._content;
    }
}

/**
 * @interface SyncDocumentInPort
 * @description This interface is implemented by {@link SyncDocumentUseCase}.
 */
export interface SyncDocumentInPort {
    sync(syncDocumentQuery: SyncDocumentCommand): Promise<boolean>;
}

export class SyncDocumentCommand {
    private readonly _content: string;

    constructor(
        private readonly _fileName: string,
        content: string,
    ) {
        if (!this.validate(content)) {
            throw new Error("Invalid message");
        }

        this._content = content;
    }

    public get content(): string {
        if (!this._content) {
            throw new Error("Content is undefined");
        }
        return this._content;
    }

    public get fileName(): string {
        return this._fileName;
    }

    private validate(content: string): boolean {
        // TODO: Validate against JSON schema
        return true;
    }
}

/**
 * @interface ReadVsCodeConfigInPort
 * @description This interface is implemented by {@link ReadVsCodeConfigUseCase}.
 */
export interface ReadVsCodeConfigInPort {
    readVsCodeConfig(readVsCodeConfigQuery: ReadVsCodeConfigQuery): string;
}

export class ReadVsCodeConfigQuery {
    constructor(private readonly _key: string) {}

    public get key(): string {
        return this._key;
    }
}

/**
 * @interface ReadJsonFormInPort
 * @description This interface is implemented by {@link ReadJsonFormUseCase}.
 */
export interface ReadJsonFormInPort {
    readJsonForm(readJsonFormQuery: ReadJsonFormQuery): Map<string, Promise<string>>;
}

export class ReadJsonFormQuery {
    constructor(
        private readonly _fileName: string,
        private readonly _basePath: string,
    ) {}

    public get fileName(): string {
        return this._fileName;
    }

    public get basePath(): string {
        return this._basePath;
    }
}

/**
 * @interface RestoreWebviewInPort
 * @description This interface is implemented by {@link RestoreWebviewUseCase}.
 */
export interface RestoreWebviewInPort {
    restore(restoreWebviewCommand: RestoreWebviewCommand): Promise<boolean>;
}

export class RestoreWebviewCommand {
    constructor(
        private readonly _webviewId: string,
        private readonly _content: string,
    ) {}

    public get webviewId(): string {
        return this._webviewId;
    }

    public get content(): string {
        return this._content;
    }
}
