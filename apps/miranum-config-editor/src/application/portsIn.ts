/**
 * @module In-Ports
 * @description In-Ports are interfaces that are implemented by use cases. \
 * List of In-Ports:
 * - {@link InitWebviewInPort}
 * - {@link SyncWebviewInPort}
 * - {@link SyncDocumentInPort}
 */
import { MessageType, WebviewMessage } from "../common";

//
// InitWebviewUseCase
// ==================>
export interface InitWebviewInPort {
    initWebview(initWebviewCommand: InitWebviewCommand): Promise<boolean>;
}

export class InitWebviewCommand {
    constructor(
        private readonly _webviewId: string,
        content: string,
    ) {
        if (!(this.validate(/*content*/))) {
            throw new Error("Invalid content");
        }

        this.mapContentToMessage(content);
    }

    // FIXME: change any to a proper type
    private _message: WebviewMessage<string> | undefined;

    public get message(): WebviewMessage<string> {
        if (!this._message) {
            throw new Error("Message is undefined");
        }
        return this._message;
    }

    public get webviewId(): string {
        return this._webviewId;
    }

    public validate(/*content: string*/): boolean {
        return true;
    }

    private mapContentToMessage(data: string): void {
        this._message = {
            type: MessageType.UPDATE,
            data,
        };
    }
}

//
// SyncWebviewUseCase
// ==================>
export interface SyncWebviewInPort {
    sync(syncWebviewCommand: SyncWebviewCommand): Promise<boolean>;
}

export class SyncWebviewCommand {
    constructor(
        private readonly _webviewId: string,
        content: string,
    ) {
        if (!(this.validate(/*content*/))) {
            throw new Error("Invalid content");
        }

        this.mapContentToMessage(content);
    }

    // FIXME: change any to a proper type
    private _message: WebviewMessage<string> | undefined;

    public get message(): WebviewMessage<string> {
        if (!this._message) {
            throw new Error("Message is undefined");
        }
        return this._message;
    }

    public get webviewId(): string {
        return this._webviewId;
    }

    private validate(/*data: string*/): boolean {
        return true;
    }

    private mapContentToMessage(data: string): void {
        this._message = {
            type: MessageType.UPDATE,
            data,
        };
    }
}

//
// SyncDocumentUseCase
// ===================>
export interface SyncDocumentInPort {
    sync(syncDocumentQuery: SyncDocumentCommand): Promise<boolean>;
}

export class SyncDocumentCommand {
    constructor(
        private readonly _fileName: string,
        message: WebviewMessage<string>,
    ) {
        if (!(this.validate(/*message*/))) {
            throw new Error("Invalid message");
        }

        this.mapMessageToContent(message);
    }

    private _content: string | undefined;

    public get content(): string {
        if (!this._content) {
            throw new Error("Content is undefined");
        }
        return this._content;
    }

    public get fileName(): string {
        return this._fileName;
    }

    private validate(/*message: WebviewMessage<any>*/): boolean {
        return true;
    }

    private mapMessageToContent(message: WebviewMessage<string>): void {
        this._content = message.data;
    }
}
