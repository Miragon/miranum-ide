import { inject, injectable } from "tsyringe";

import { CreateWebviewInPort, GetMiranumWorkspaceInPort } from "../application/ports/in";
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
    ) {}

    async createWebview() {
        await this.createWebviewInPort.create();
    }

    async sendInitialData() {
        await this.createWebviewInPort.sendInitialData();
    }
}
