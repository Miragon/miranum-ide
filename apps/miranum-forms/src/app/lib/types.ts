import { TextDocument } from "vscode";

export interface IContentController<T> {
    document: TextDocument;
    subscribe(observer: Updatable<T>): void;
}

export interface Updatable<T> {
    update(content: T): void;
}

export enum ViewState {
    "open" = "open",
    "closed" = "closed",
}

export type VsCode = {
    postMessage(message: VscMessage): void;
    getState(): VscState;
    setState(state: VscState): void;
};

type VscMessage = {
    type: string;
    content: string;
};

type VscState = {
    text: string;
    mode: string;
};
