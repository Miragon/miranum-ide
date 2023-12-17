import {inject, injectable} from "tsyringe";

import {FilterWorkspaceInPort, InitiateWebviewInPort, SendPathForNewProjectInPort} from "./ports/in";
import {FilePickerOutPort, WebviewOutPort, WorkspaceOutPort} from "./ports/out";
import {MiranumWorkspace} from "./model";

@injectable()
export class FilterWorkspacesUseCase implements FilterWorkspaceInPort {
    constructor(
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
    ) {}

    async filterWorkspaces(): Promise<boolean> {
        const workspaces = this.workspaceOutPort.getWorkspaces()

        if (workspaces.size === 0) {
            return false
        }

        const miranumWorkspaces: MiranumWorkspace[] = []
        const files = await this.workspaceOutPort.findFiles("miranum.json");

        for (const [wsName, wsPath] of workspaces) {
            for (const file of files) {
                if (file.startsWith(wsPath)) {
                    miranumWorkspaces.push(new MiranumWorkspace(wsName, wsPath));
                    break;
                }
            }
        }

        this.workspaceOutPort.setMiranumWorkspaces(miranumWorkspaces);
        return true
    }
}

@injectable()
export class InitiateWebviewUseCase implements InitiateWebviewInPort {
    constructor(
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,) {
    }

    async initiateWebview(): Promise<boolean> {
        return this.webviewOutPort.sendInitialData(this.workspaceOutPort.getLatestMiranumWorkspaces());
    }

}

@injectable()
export class SendPathForNewProject implements SendPathForNewProjectInPort {
    constructor(
        @inject("FilePickerOutPort") private readonly filePickerOutPort: FilePickerOutPort,
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {
    }

    async sendPathForNewProject(): Promise<boolean> {
        return this.webviewOutPort.sendPathForNewProject(await this.filePickerOutPort.getPath());
    }
}
