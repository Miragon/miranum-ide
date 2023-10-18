import { WebviewMessage } from "../common";

export interface WebviewOutPort {
    postMessage(webviewId: string, message: WebviewMessage<string>): Promise<boolean>;

    loadActiveWebviewId(): string;
}

export interface DocumentOutPort {
    write(fileName: string, content: string): Promise<boolean>;

    save(fileName: string): Promise<boolean>;

    loadActiveDocument(): string;
}
