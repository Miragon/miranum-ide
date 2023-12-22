import { inject, injectable } from "tsyringe";
import {
    CreateNewWorkspaceCommand,
    OpenWorkspaceCommand,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import {
    CreateMiranumWorkspaceInPort,
    CreateWebviewInPort,
    GetMiranumWorkspaceInPort,
    OpenMiranumWorkspaceInPort,
    SendPathForNewWorkspaceInPort,
} from "../../application/ports/in";
import { MiranumWorkspace, NewMiranumWorkspace } from "../../application/model";

@injectable()
export class WorkspaceAdapter {
    constructor(
        @inject("GetMiranumWorkspaceInPort")
        private readonly getMiranumWorkspaceInPort: GetMiranumWorkspaceInPort,
    ) {}

    async getMiranumWorkspaces(): Promise<MiranumWorkspace[]> {
        return this.getMiranumWorkspaceInPort.getMiranumWorkspaces();
    }
}

@injectable()
export class WebviewAdapter {
    constructor(
        @inject("CreateWebviewInPort")
        private readonly createWebviewInPort: CreateWebviewInPort,
        @inject("SendPathForNewWorkspaceInPort")
        private readonly sendPathForNewWorkspaceInPort: SendPathForNewWorkspaceInPort,
        @inject("OpenMiranumWorkspaceInPort")
        private readonly openMiranumWorkspaceInPort: OpenMiranumWorkspaceInPort,
        @inject("CreateMiranumWorkspaceInPort")
        private readonly createMiranumWorkspaceInPort: CreateMiranumWorkspaceInPort,
    ) {}

    async createWebview() {
        await this.createWebviewInPort.create();
    }

    async sendLatestWorkspaces() {
        await this.createWebviewInPort.sendLatestMiranumWorkspaces();
    }

    async sendImagePaths() {
        await this.createWebviewInPort.sendImagePaths();
    }

    async sendPathForNewWorkspace() {
        await this.sendPathForNewWorkspaceInPort.sendPathForNewMiranumWorkspace();
    }

    async openWorkspace(openWorkspaceCommand?: OpenWorkspaceCommand) {
        if (openWorkspaceCommand) {
            const miranumWorkspace = new MiranumWorkspace(
                openWorkspaceCommand.workspace.name,
                openWorkspaceCommand.workspace.path,
            );
            await this.openMiranumWorkspaceInPort.openMiranumWorkspace(miranumWorkspace);
            return;
        } else {
            await this.openMiranumWorkspaceInPort.openMiranumWorkspace();
        }
    }

    async createWorkspace(createNewWorkspaceCommand: CreateNewWorkspaceCommand) {
        const newMiranumWorkspace = new NewMiranumWorkspace(
            new MiranumWorkspace(
                createNewWorkspaceCommand.workspace.name,
                createNewWorkspaceCommand.workspace.path,
            ),
            new Set(createNewWorkspaceCommand.artifacts),
            createNewWorkspaceCommand.engine,
        );
        await this.createMiranumWorkspaceInPort.createMiranumWorkspace(
            newMiranumWorkspace,
        );
    }
}
