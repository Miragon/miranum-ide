export type VsCode = {
    postMessage(message: VscMessage): void;
    getState(): VscState;
    setState(state: VscState): void;
};

type VscMessage = {
    type: string;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    content: any;
};

type VscState = {
    text: string;
    files: string;
};

export interface FolderContent {
    type: string,
    files: JSON[] | string[]
}

export interface WorkspaceFolder {
    type: string;
    path: string;
    extension: string;
}
