import { MiranumWorkspace } from "../model";

export interface GetMiranumWorkspaceInPort {
    getMiranumWorkspaces(): Promise<MiranumWorkspace[]>;
}

export interface CreateWebviewInPort {
    create(): Promise<boolean>;

    sendInitialData(): Promise<boolean>;
}

export interface SendPathForNewProjectInPort {
    sendPathForNewProject(): Promise<boolean>;
}

export interface OpenWorkspaceInPort {
    openWorkspace(): Promise<boolean>;
}
