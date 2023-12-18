import { inject, injectable } from "tsyringe";

import {
    CreateWebviewInPort,
    GetMiranumWorkspaceInPort,
    SendPathForNewProjectInPort,
} from "./ports/in";
import { FilePickerOutPort, WebviewOutPort, WorkspaceOutPort } from "./ports/out";
import { MiranumWorkspace } from "./model";

@injectable()
export class GetMiranumWorkspacesUseCase implements GetMiranumWorkspaceInPort {
    constructor(
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
    ) {}

    async getMiranumWorkspaces(): Promise<MiranumWorkspace[]> {
        const workspaces = this.workspaceOutPort.getWorkspaces();

        if (workspaces.size === 0) {
            return [];
        }

        const miranumWorkspaces: MiranumWorkspace[] = [];
        const files = await this.workspaceOutPort.findFiles("miranum.json");

        for (const [wsName, wsPath] of workspaces) {
            for (const file of files) {
                if (file.startsWith(wsPath)) {
                    miranumWorkspaces.push(new MiranumWorkspace(wsName, wsPath));
                    break;
                }
            }
        }

        return miranumWorkspaces;
    }
}

@injectable()
export class CreateWebviewUseCase implements CreateWebviewInPort {
    constructor(
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {}

    async create(): Promise<boolean> {
        return this.webviewOutPort.open();
    }

    async sendInitialData(): Promise<boolean> {
        return this.webviewOutPort.sendInitialData(
            this.workspaceOutPort.getLatestMiranumWorkspaces(),
        );
    }
}

@injectable()
export class SendPathForNewProject implements SendPathForNewProjectInPort {
    constructor(
        @inject("FilePickerOutPort")
        private readonly filePickerOutPort: FilePickerOutPort,
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {}

    async sendPathForNewProject(): Promise<boolean> {
        return this.webviewOutPort.sendPathForNewProject(
            await this.filePickerOutPort.getPath(),
        );
    }
}
