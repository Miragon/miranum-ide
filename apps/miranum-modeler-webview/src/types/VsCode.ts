export type VsCode = {
    postMessage(message: VscMessage): void;
    getState(): VscState;
    setState(state: VscState): void;
};

export type VscMessage = {
    type: string;
    content: any;
};

export type VscState = {
    bpmn: string;
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
