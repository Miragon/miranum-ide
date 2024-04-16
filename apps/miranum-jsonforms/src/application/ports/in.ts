export interface DisplayFormBuilderInPort {
    display(editorId: string): Promise<boolean>;
}

export interface DisplayFormPreviewInPort {
    display(): Promise<boolean>;
}

export interface SetSettingInPort {
    setSetting(): Promise<boolean>;
}

export interface SyncDocumentInPort {
    sync(editorId: string, content: string): Promise<boolean>;
}

export interface GetDocumentInPort {
    getPath(): string;
}

export interface SplitFileInPort {
    split(): Promise<boolean>;
}

/**
 * Display a message to the user in the UI.
 */
export interface DisplayMessageInPort {
    info(message: string): void;

    error(message: string): void;
}

export interface ToggleTextEditorInPort {
    toggle(): Promise<boolean>;
}

export interface OpenLoggingConsoleInPort {
    open(): void;
}

/**
 * Log a message to the console.
 */
export interface LogMessageInPort {
    info(message: string): void;

    error(error: Error): void;
}
