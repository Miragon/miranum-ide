/**
 * @module Out-Adapter
 * @description In the context of the "Hexagonal Architecture", Out-Adapters are objects that are called by our application. \
 * List of Adapters:
 * - {@link WorkspaceAdapter}
 * - {@link WebviewAdapter}
 * - {@link FilePickerAdapter}
 */
import { commands, window, workspace } from "vscode";
import {injectable} from "tsyringe";
import { MessageType, VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";

import { WelcomeView } from "./webview";
import { EXTENSION_CONTEXT } from "../common";
import { MiranumWorkspace } from "../application/model";
import { FilePickerOutPort, WebviewOutPort, WorkspaceOutPort } from "../application/ports/out";
import { ConsoleMessageType } from "./api";

/**
 * @class WorkspaceAdapter
 */
export class WorkspaceAdapter implements WorkspaceOutPort {
    private storageKey = "miranum-workspace";

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

    async openMiranumWorkspace(miranumWorkspace: MiranumWorkspace): Promise<boolean> {
        await commands.executeCommand(
            "vscode.openFolder",
            `${miranumWorkspace.path}/${miranumWorkspace.name}`,
        );

        return true;
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
@injectable()
export class WebviewAdapter implements WebviewOutPort {
    constructor(
        private readonly webview: WelcomeView
    ) {}

    open(): boolean {
        return this.webview.create();
    }

    close(): boolean {
        return this.webview.dispose();
    }

    async sendInitialData(data: MiranumWorkspace[]): Promise<boolean> {
        const message: VscMessage<MiranumWorkspace[]> = {
            type: MessageType.INITIALIZE,
            data,
        };

        return (await this.webview.postMessage(message)) ?? false;
    }

    async sendPathForNewProject(path: string): Promise<boolean> {
        const message: VscMessage<string> = {
            type: ConsoleMessageType.CREATE_PROJECT,
            data: path,
        };

        return (await this.webview.postMessage(message)) ?? false;
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
