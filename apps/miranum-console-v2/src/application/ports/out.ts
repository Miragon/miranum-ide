import {MiranumWorkspace} from "../model";
import {WelcomeWebview} from "../../adapter/model";

export interface WorkspaceOutPort {
    filterWorkspaces(): Promise<boolean>
    getWorkspaces(): MiranumWorkspace[]
    getLatestWorkspaces(): MiranumWorkspace[]
    openWorkspace(workspace: MiranumWorkspace): Promise<boolean>
    closeWorkspace(workspace: MiranumWorkspace): boolean
}

export interface WebviewOutPort {
    setWebview(webview: WelcomeWebview): boolean
    openWebview(): boolean
    closeWebview(): boolean
    postMessage(type: string, data?: MiranumWorkspace[] | string): Promise<boolean>
}
