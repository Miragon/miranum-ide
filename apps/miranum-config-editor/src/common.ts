import { ExtensionContext } from "vscode";

export enum UpdateFrom {
    NULL = "",
    WEBVIEW = "webview",
    DOCUMENT = "document",
}

export let updateFrom: UpdateFrom;

export function setUpdateFrom(uf: UpdateFrom): void {
    updateFrom = uf;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export class EXTENSION_CONTEXT {
    private static instance: EXTENSION_CONTEXT;

    private static context: ExtensionContext;

    private constructor(context: ExtensionContext) {
        EXTENSION_CONTEXT.context = context;
    }

    public static setContext(context: ExtensionContext): EXTENSION_CONTEXT {
        if (this.instance) {
            throw new Error("ExtensionUri is already set");
        }
        this.instance = new EXTENSION_CONTEXT(context);
        return this.instance;
    }

    public static getContext(): ExtensionContext {
        if (!this.instance) {
            throw new Error("ExtensionUri is not set");
        }
        return EXTENSION_CONTEXT.context;
    }
}

export type WebviewMessage<T> = {
    type: MessageType;
    data: T;
};

export enum MessageType {
    UPDATE = "UPDATE",
    INFO = "INFO",
    ERROR = "ERROR",
}
