import { MiranumWorkspace } from "../model";

export interface WorkspaceOutPort {
    getWorkspaces(): Map<string, string>;

    getLatestMiranumWorkspaces(): MiranumWorkspace[];

    openMiranumWorkspace(workspace: MiranumWorkspace): Promise<boolean>;

    findFiles(filename: string): Promise<string[]>;
}

export interface WebviewOutPort {
    open(): boolean;

    close(): boolean;

    sendInitialData(data: MiranumWorkspace[]): Promise<boolean>;

    sendPathForNewProject(path: string): Promise<boolean>;
}

export interface FilePickerOutPort {
    getPath(): Promise<string>;
}
