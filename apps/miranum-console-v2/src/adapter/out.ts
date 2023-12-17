/**
 * @module Out-Adapter
 * @description In the context of the "Hexagonal Architecture", Out-Adapters are objects that are called by our application. \
 * List of Adapters:
 * - {@link WorkspaceAdapter}
 * - {@link WebviewAdapter}
 * - {@link FilePickerAdapter}
 */
import {window, workspace} from "vscode";
import {MessageType, VscMessage} from "@miranum-ide/vscode/miranum-vscode-webview";

import {WelcomeView} from "./webview";
import {EXTENSION_CONTEXT} from "../common";
import {MiranumWorkspace} from "../application/model";
import {FilePickerOutPort, WebviewOutPort, WorkspaceOutPort} from "../application/ports/out";
import {ConsoleMessageType} from "./api";
import {maxLatestWorkspaces} from "./config";

/**
 * @class WorkspaceAdapter
 */
export class WorkspaceAdapter implements WorkspaceOutPort {

    private storageKey = "miranum-workspace";

    private miranumWorkspaces: MiranumWorkspace[] = [];

    getWorkspaces(): Map<string, string> {
        const workspaceFolders = workspace.workspaceFolders;

        if (!workspaceFolders) {
            return new Map();
        }

        const wsPaths: Map<string, string> = new Map();

        for (const ws of workspaceFolders) {
            wsPaths.set(ws.name, ws.uri.path)
        }

        return wsPaths
    }

    getMiranumWorkspaces(): MiranumWorkspace[] {
        return this.miranumWorkspaces;
    }

    setMiranumWorkspaces(miranumWorkspaces: MiranumWorkspace[]): boolean {
        this.miranumWorkspaces = miranumWorkspaces;
        return true;
    }

    getLatestMiranumWorkspaces(): MiranumWorkspace[] {
        const latestWorkspaces = EXTENSION_CONTEXT.getContext().globalState.get<MiranumWorkspace[]>(this.storageKey);

        if (!latestWorkspaces) {
            return [];
        }

        return latestWorkspaces;
    }

    async openMiranumWorkspace(miranumWorkspace: MiranumWorkspace): Promise<boolean> {
        this.miranumWorkspaces.push(miranumWorkspace);

        // Add workspace to global storage
        const storage = EXTENSION_CONTEXT.getContext().globalState;
        const latestWorkspaces = storage.get<MiranumWorkspace[]>(this.storageKey);

        if (!latestWorkspaces) {
            await storage.update("miranum-workspace", miranumWorkspace);
            return true;
        }

        const index = latestWorkspaces.indexOf(miranumWorkspace);

        if (index === -1) {
            if (latestWorkspaces.length >= maxLatestWorkspaces) {
                latestWorkspaces.pop();
            }
            await storage.update(this.storageKey, [miranumWorkspace, ...latestWorkspaces]);
            return true;
        }

        latestWorkspaces.splice(index, 1);
        await storage.update(this.storageKey, [miranumWorkspace, ...latestWorkspaces]);

        return true;
    }

    closeMiranumWorkspace(miranumWorkspace: MiranumWorkspace): boolean {
        const index = this.miranumWorkspaces.indexOf(miranumWorkspace);
        if (index > -1) {
            this.miranumWorkspaces.splice(index, 1);
            return true;
        }
        return false;
    }

    async findFiles(filename: string): Promise<string[]> {
        const files = await workspace.findFiles(`**/${filename}`);
        const filePaths: string[] = [];

        for (const file of files) {
            filePaths.push(file.path);
        }

        return filePaths;
    }
}

/**
 * @class WebviewAdapter
 */
export class WebviewAdapter implements WebviewOutPort {

    constructor(
        private readonly webview: WelcomeView) {
    }

    openWebview(): boolean {
        this.webview.create()
        return true;
    }

    closeWebview(): boolean {
        this.webview.close();
        return true;
    }

    async sendInitialData(data: MiranumWorkspace[]): Promise<boolean> {
        const message: VscMessage<MiranumWorkspace[]> = {
            type: MessageType.INITIALIZE,
            data
        }

        return await this.webview.postMessage(message) ?? false;
    }

    async sendPathForNewProject(path: string): Promise<boolean> {
        const message: VscMessage<string> = {
            type: ConsoleMessageType.CREATE_PROJECT,
            data: path
        }

        return await this.webview.postMessage(message) ?? false;
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

        if (!fileUris || fileUris.length > 1) {
            throw new Error("Invalid file path");
        }

        return fileUris[0].path;
    }
}
