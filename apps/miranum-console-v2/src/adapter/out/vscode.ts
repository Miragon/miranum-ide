/**
 * @module Out-Adapter
 * @description In the context of the "Hexagonal Architecture", Out-Adapters are objects that are called by our application. \
 * List of Adapters:
 * - {@link WorkspaceAdapter}
 * - {@link WebviewAdapter}
 * - {@link FilePickerAdapter}
 */
import { Uri, window, workspace } from "vscode";
import { injectable } from "tsyringe";
import {
    ImagePath,
    ImagePathQuery,
    LatestWorkspaceQuery,
    NewWorkspacePathQuery,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import { WelcomeView } from "../webview";
import { EXTENSION_CONTEXT } from "../../common";
import { MiranumWorkspace, NewMiranumWorkspace } from "../../application/model";
import { FilePickerOutPort, WebviewOutPort, WorkspaceOutPort } from "../../application/ports/out";

/**
 * @class WorkspaceAdapter
 */
export class WorkspaceAdapter implements WorkspaceOutPort {
    private storageKey = "miranum-workspace";

    async findFiles(filename: string): Promise<string[]> {
        const files = await workspace.findFiles(`**/${filename}`);
        const filePaths: string[] = [];

        for (const file of files) {
            filePaths.push(file.path);
        }

        return filePaths;
    }

    getWorkspaces(): Map<string, string> {
        const workspaceFolders = workspace.workspaceFolders;

        if (!workspaceFolders) {
            return new Map();
        }

        const wsPaths: Map<string, string> = new Map();

        for (const ws of workspaceFolders) {
            wsPaths.set(ws.name, ws.uri.path);
        }

        return wsPaths;
    }

    getLatestMiranumWorkspaces(): MiranumWorkspace[] {
        const latestWorkspaces = EXTENSION_CONTEXT.getContext().globalState.get<
            MiranumWorkspace[]
        >(this.storageKey);

        if (!latestWorkspaces) {
            return [];
        }

        return latestWorkspaces;
    }

    async addToLatestMiranumWorkspaces(
        miranumWorkspaces: MiranumWorkspace[],
    ): Promise<boolean> {
        await EXTENSION_CONTEXT.getContext().globalState.update(
            this.storageKey,
            miranumWorkspaces,
        );
        return true;
    }

    openMiranumWorkspace(miranumWorkspace: MiranumWorkspace): boolean {
        const workspaceUri = Uri.file(
            `${miranumWorkspace.path}/${miranumWorkspace.name}`,
        );

        // If the workspace is empty this will lead to the termination of the application
        // https://code.visualstudio.com/api/references/vscode-api#workspace > updateWorkspaceFolders
        return workspace.updateWorkspaceFolders(
            workspace.workspaceFolders ? workspace.workspaceFolders.length : 0,
            null,
            { name: miranumWorkspace.name, uri: workspaceUri },
        );
    }

    async createMiranumWorkspace(
        newMiranumWorkspace: NewMiranumWorkspace,
    ): Promise<boolean> {
        // TODO: Implement
        return true;
    }
}

/**
 * @class WebviewAdapter
 */
@injectable()
export class WebviewAdapter implements WebviewOutPort {
    constructor(private readonly webview: WelcomeView) {}

    open(): boolean {
        return this.webview.create();
    }

    close(): boolean {
        return this.webview.dispose();
    }

    async sendLatestMiranumWorkspaces(
        miranumWorkspaces: MiranumWorkspace[],
    ): Promise<boolean> {
        const latestWorkspaceQuery = new LatestWorkspaceQuery(miranumWorkspaces);
        return (await this.webview.postMessage(latestWorkspaceQuery)) ?? false;
    }

    async sendImagePaths(paths: Map<string, string>): Promise<boolean> {
        const linksAsWebviewUri = this.webview.getLinkAsWebviewUri(paths);
        const imagePaths: ImagePath[] = [];

        for (const [id, path] of linksAsWebviewUri) {
            imagePaths.push(new ImagePath(id, path));
        }

        return (await this.webview.postMessage(new ImagePathQuery(imagePaths))) ?? false;
    }

    async sendPathForNewMiranumWorkspace(path: string): Promise<boolean> {
        const newWorkspacePathQuery = new NewWorkspacePathQuery(path);
        return (await this.webview.postMessage(newWorkspacePathQuery)) ?? false;
    }
}

/**
 * @class FilePickerAdapter
 */
export class FilePickerAdapter implements FilePickerOutPort {
    async getPath(): Promise<string> {
        const fileUris = await window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
        });

        if (!fileUris) {
            throw new Error("Invalid file path");
        }

        return fileUris[0].path;
    }
}
