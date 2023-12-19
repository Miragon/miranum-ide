import { inject, injectable } from "tsyringe";

import {
    CreateWebviewInPort,
    GetMiranumWorkspaceInPort,
    OpenWorkspaceInPort,
    SendPathForNewProjectInPort,
} from "./ports/in";
import { FilePickerOutPort, WebviewOutPort, WorkspaceOutPort } from "./ports/out";
import { MiranumWorkspace } from "./model";
import { maxLatestWorkspaces } from "./config";

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
export class SendPathForNewProjectUseCase implements SendPathForNewProjectInPort {
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

@injectable()
export class OpenWorkspaceUseCase implements OpenWorkspaceInPort {
    constructor(
        @inject("FilePickerOutPort")
        private readonly filePickerOutPort: FilePickerOutPort,
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
    ) {}

    async openWorkspace(): Promise<boolean> {
        // Get selected MiranumWorkspace
        const fullPath = (await this.filePickerOutPort.getPath()).split("/");
        // FIXME: Is it possible to have an empty path?
        const name = fullPath.pop() ?? "";
        const path = fullPath.join("/");
        const miranumWorkspace = new MiranumWorkspace(name, path);

        // Add to the latest workspaces
        const latestMiranumWorkspaces =
            this.workspaceOutPort.getLatestMiranumWorkspaces();
        const index = latestMiranumWorkspaces.indexOf(miranumWorkspace);

        if (index === -1) {
            if (latestMiranumWorkspaces.length >= maxLatestWorkspaces) {
                latestMiranumWorkspaces.pop();
            }
        } else {
            latestMiranumWorkspaces.splice(index, 1);
        }

        await this.workspaceOutPort.addToLatestMiranumWorkspaces([
            miranumWorkspace,
            ...latestMiranumWorkspaces,
        ]);

        // Open workspace
        return this.workspaceOutPort.openMiranumWorkspace(miranumWorkspace);
    }
}
