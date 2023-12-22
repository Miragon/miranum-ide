import { inject, injectable } from "tsyringe";

import {
    CreateMiranumWorkspaceInPort,
    CreateWebviewInPort,
    GetMiranumWorkspaceInPort,
    OpenMiranumWorkspaceInPort,
    SendPathForNewWorkspaceInPort,
} from "./ports/in";
import {
    FilePickerOutPort,
    MiranumCliOutPort,
    WebviewOutPort,
    WorkspaceOutPort,
} from "./ports/out";
import { MiranumWorkspace, NewMiranumWorkspace } from "./model";
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
    private readonly webviewPath: string;

    constructor(
        @inject("WebviewPath") webviewPath: string,
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {
        this.webviewPath = webviewPath;
    }

    async create(): Promise<boolean> {
        return this.webviewOutPort.open();
    }

    async sendLatestMiranumWorkspaces(): Promise<boolean> {
        return this.webviewOutPort.sendLatestMiranumWorkspaces(
            this.workspaceOutPort.getLatestMiranumWorkspaces(),
        );
    }

    async sendImagePaths(): Promise<boolean> {
        const imagePaths = new Map<string, string>([
            ["miranumLogo", `${this.webviewPath}/logo.png`],
        ]);
        return this.webviewOutPort.sendImagePaths(imagePaths);
    }
}

@injectable()
export class SendPathForNewWorkspaceUseCase implements SendPathForNewWorkspaceInPort {
    constructor(
        @inject("FilePickerOutPort")
        private readonly filePickerOutPort: FilePickerOutPort,
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {}

    async sendPathForNewMiranumWorkspace(): Promise<boolean> {
        return this.webviewOutPort.sendPathForNewMiranumWorkspace(
            await this.filePickerOutPort.getPath(),
        );
    }
}

@injectable()
export class OpenMiranumWorkspaceUseCase implements OpenMiranumWorkspaceInPort {
    constructor(
        @inject("FilePickerOutPort")
        private readonly filePickerOutPort: FilePickerOutPort,
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
        @inject("WebviewOutPort") private readonly webviewOutPort: WebviewOutPort,
    ) {}

    async openMiranumWorkspace(miranumWorkspace?: MiranumWorkspace): Promise<boolean> {
        if (miranumWorkspace) {
            return this.workspaceOutPort.openMiranumWorkspace(miranumWorkspace);
        } else {
            // Get selected MiranumWorkspace
            const fullPath = (await this.filePickerOutPort.getPath()).split("/");
            // FIXME: Is it possible to have an empty path?
            const name = fullPath.pop() ?? "";
            const path = fullPath.join("/");
            const workspace = new MiranumWorkspace(name, path);

            // Add to the latest workspaces
            const latestMiranumWorkspaces =
                this.workspaceOutPort.getLatestMiranumWorkspaces();
            const index = latestMiranumWorkspaces.findIndex((ws) =>
                workspace.compare(ws),
            );

            if (index === -1) {
                if (latestMiranumWorkspaces.length >= maxLatestWorkspaces) {
                    latestMiranumWorkspaces.pop();
                }
            } else {
                latestMiranumWorkspaces.splice(index, 1);
            }

            await this.workspaceOutPort.addToLatestMiranumWorkspaces([
                workspace,
                ...latestMiranumWorkspaces,
            ]);

            return this.workspaceOutPort.openMiranumWorkspace(workspace);
        }
    }
}

@injectable()
export class CreateMiranumWorkspaceUseCase implements CreateMiranumWorkspaceInPort {
    constructor(
        @inject("WorkspaceOutPort") private readonly workspaceOutPort: WorkspaceOutPort,
        @inject("MiranumCliOutPort")
        private readonly miranumCliOutPort: MiranumCliOutPort,
    ) {}

    async createMiranumWorkspace(
        newMiranumWorkspace: NewMiranumWorkspace,
    ): Promise<boolean> {
        return this.workspaceOutPort.createMiranumWorkspace(newMiranumWorkspace);
    }
}
