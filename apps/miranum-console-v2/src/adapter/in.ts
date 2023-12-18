import { inject, injectable } from "tsyringe";

import {
    CreateWebviewInPort,
    GetMiranumWorkspaceInPort,
    OpenWorkspaceInPort,
    SendPathForNewProjectInPort,
} from "../application/ports/in";
import { MiranumWorkspace } from "../application/model";

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
        @inject("SendPathForNewProjectInPort")
        private readonly sendPathForNewProjectInPort: SendPathForNewProjectInPort,
        @inject("OpenWorkspaceInPort")
        private readonly openWorkspaceInPort: OpenWorkspaceInPort,
    ) {}

    async createWebview() {
        await this.createWebviewInPort.create();
    }

    async sendInitialData() {
        await this.createWebviewInPort.sendInitialData();
    }

    async sendPathForNewProject() {
        await this.sendPathForNewProjectInPort.sendPathForNewProject();
    }

    async openWorkspace() {
        await this.openWorkspaceInPort.openWorkspace();
    }
}
