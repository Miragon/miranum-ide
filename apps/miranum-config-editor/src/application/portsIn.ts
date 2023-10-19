/**
 * @module In-Ports
 * @description In-Ports are interfaces that are implemented by use cases. \
 * List of In-Ports:
 * - {@link InitWebviewInPort}
 * - {@link SyncWebviewInPort}
 * - {@link SyncDocumentInPort}
 */

//
// InitWebviewUseCase
// ==================>
export interface InitWebviewInPort {
    initWebview(initWebviewCommand: WebviewCommand): Promise<boolean>;
}

export class WebviewCommand {
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

//
// SyncWebviewUseCase
// ==================>
export interface SyncWebviewInPort {
    sync(syncWebviewCommand: WebviewCommand): Promise<boolean>;
}

//
// SyncDocumentUseCase
// ===================>
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
