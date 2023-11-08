import {
    ConfigEditorData,
    VscMessage,
} from "@miranum-ide/vscode/shared/miranum-config-editor";

export interface WebviewOutPort {
    postMessage(
        webviewId: string,
        message: VscMessage<ConfigEditorData>,
    ): Promise<boolean>;

    loadActiveWebviewId(): string;
}

export interface DocumentOutPort {
    write(fileName: string, content: string): Promise<boolean>;

    save(fileName: string): Promise<boolean>;

    loadActiveDocument(): string;
}

export interface ReaderOutPort {
    readFile(fileName: string): Promise<string>;
}

export interface VsCodeConfigOutPort {
    getConfiguration<T>(section: string): T | undefined;
}
