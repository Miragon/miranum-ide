import { JsonSchema, Layout } from "@jsonforms/core";

export enum MessageType {
    initialize = "initialize",
    restore = "restore",
    confirmation = "confirmation",
    msgFromExtension = "msgFromExtension",
    msgFromWebview = "msgFromWebview",
    undo = "undo",
    redo = "redo",
    info = "info",
    error = "error",
}

export interface VscMessage<T> {
    type: string;
    data?: T;
    confirm?: boolean;
    logger?: string;
}

export interface VscState<T> {
    mode: string;
    data?: T;
}

export interface FormBuilderData {
    schema?: JsonSchema;
    uischema?: Layout;
}
