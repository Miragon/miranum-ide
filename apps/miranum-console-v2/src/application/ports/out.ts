import {MiranumWorkspace} from "../model";

export interface WorkspaceOutPort {
    getWorkspaces(): Map<string, string>
    getMiranumWorkspaces(): MiranumWorkspace[]
    setMiranumWorkspaces(miranumWorkspaces: MiranumWorkspace[]): boolean
    getLatestMiranumWorkspaces(): MiranumWorkspace[]
    openMiranumWorkspace(workspace: MiranumWorkspace): Promise<boolean>
    closeMiranumWorkspace(workspace: MiranumWorkspace): boolean
    findFiles(filename: string): Promise<string[]>
}

export interface WebviewOutPort {
    openWebview(): boolean
    closeWebview(): boolean
    sendInitialData(data: MiranumWorkspace[]): Promise<boolean>
    sendPathForNewProject(path: string): Promise<boolean>
}

export interface FilePickerOutPort {
    getPath(): Promise<string>
}
