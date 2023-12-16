import {inject, injectable} from "tsyringe";
import {FilterWorkspaceInPort, GetLatestWorkspaceInPort, PostMessageInPort} from "./ports/in";
import {WebviewOutPort, WorkspaceOutPort} from "./ports/out";
import {MiranumWorkspace} from "./model";

@injectable()
export class FilterWorkspacesUseCase implements FilterWorkspaceInPort {
    constructor(
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
    ) {}

    async filterWorkspaces(): Promise<boolean> {
        return this.workspaceOutPort.filterWorkspaces();
    }
}

@injectable()
export class GetLatestWorkspaceUseCase implements GetLatestWorkspaceInPort {
    constructor(
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
    ) {}

    getLatestWorkspace(): MiranumWorkspace[] {
        return this.workspaceOutPort.getLatestWorkspaces();
    }
}

@injectable()
export class PostMessage implements PostMessageInPort {
    constructor(
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {}

    async postMessage(type: string, data?: MiranumWorkspace[] | string): Promise<boolean> {
        try {
            return await this.webviewOutPort.postMessage(type, data);
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
