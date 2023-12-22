import { MiranumWorkspace, NewMiranumWorkspace } from "../model";

export interface GetMiranumWorkspaceInPort {
    getMiranumWorkspaces(): Promise<MiranumWorkspace[]>;
}

export interface CreateWebviewInPort {
    create(): Promise<boolean>;

    sendLatestMiranumWorkspaces(): Promise<boolean>;

    sendImagePaths(): Promise<boolean>;
}

export interface SendPathForNewWorkspaceInPort {
    sendPathForNewMiranumWorkspace(): Promise<boolean>;
}

export interface OpenMiranumWorkspaceInPort {
    openMiranumWorkspace(miranumWorkspace?: MiranumWorkspace): Promise<boolean>;
}

export interface CreateMiranumWorkspaceInPort {
    createMiranumWorkspace(newMiranumWorkspace: NewMiranumWorkspace): Promise<boolean>;
}
