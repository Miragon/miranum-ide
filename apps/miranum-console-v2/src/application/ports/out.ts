import { MiranumWorkspace, NewMiranumWorkspace } from "../model";

export interface WorkspaceOutPort {
    findFiles(filename: string): Promise<string[]>;

    getWorkspaces(): Map<string, string>;

    getLatestMiranumWorkspaces(): MiranumWorkspace[];

    addToLatestMiranumWorkspaces(
        miranumWorkspaces: MiranumWorkspace[],
    ): Promise<boolean>;

    openMiranumWorkspace(miranumWorkspace: MiranumWorkspace): boolean;

    createMiranumWorkspace(newMiranumWorkspace: NewMiranumWorkspace): Promise<boolean>;
}

export interface WebviewOutPort {
    open(): boolean;

    close(): boolean;

    sendLatestMiranumWorkspaces(miranumWorkspaces: MiranumWorkspace[]): Promise<boolean>;

    sendImagePaths(paths: Map<string, string>): Promise<boolean>;

    sendPathForNewMiranumWorkspace(path: string): Promise<boolean>;
}

export interface FilePickerOutPort {
    getPath(): Promise<string>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MiranumCliOutPort {}
