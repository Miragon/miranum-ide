import {MiranumWorkspace} from "../model";

export interface FilterWorkspaceInPort {
    filterWorkspaces(): void
}

export interface GetLatestWorkspaceInPort {
    getLatestWorkspace(): MiranumWorkspace[]
}

export interface PostMessageInPort {
    postMessage(type: string, data?: MiranumWorkspace[] | string): void
}
