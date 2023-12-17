export interface FilterWorkspaceInPort {
    filterWorkspaces(): void
}

export interface InitiateWebviewInPort {
    initiateWebview(): Promise<boolean>
}

export interface SendPathForNewProjectInPort {
    sendPathForNewProject(): Promise<boolean>
}

export interface OpenWorkspaceInPort {
    openWorkspace(): Promise<boolean>
}
