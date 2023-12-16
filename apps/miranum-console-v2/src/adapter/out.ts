/**
 * @module Out-Adapter
 * @description In the context of the "Hexagonal Architecture", Out-Adapters are objects that are called by our application. \
 * List of Adapters:
 * - {@link WorkspaceAdapter}
 * - {@link WebviewAdapter}
 */
import {workspace} from "vscode";

import {MiranumWorkspace} from "../application/model";
import {WebviewOutPort, WorkspaceOutPort} from "../application/ports/out";
import {EXTENSION_CONTEXT} from "../common";
import {WelcomeWebview} from "./model";
import {VscMessage} from "@miranum-ide/vscode/miranum-vscode-webview";

/**
 * @class WorkspaceAdapter
 */
export class WorkspaceAdapter implements WorkspaceOutPort {

    private miranumWorkspaces: MiranumWorkspace[] = [];

    getWorkspaces(): MiranumWorkspace[] {
        return this.miranumWorkspaces;
    }

    getLatestWorkspaces(): MiranumWorkspace[] {
        const latestWorkspaces = EXTENSION_CONTEXT.getContext().globalState.get<MiranumWorkspace[]>("miranum-workspace");

        if (!latestWorkspaces) {
            return [];
        }

        return latestWorkspaces;
    }

    async openWorkspace(miranumWorkspace: MiranumWorkspace): Promise<boolean> {
        this.miranumWorkspaces.push(miranumWorkspace);

        // Add workspace to global storage
        const storage = EXTENSION_CONTEXT.getContext().globalState;
        const latestWorkspaces = storage.get<MiranumWorkspace[]>("miranum-workspace");

        if (!latestWorkspaces) {
            await storage.update("miranum-workspace", miranumWorkspace);
            return true;
        }

        const index = latestWorkspaces.indexOf(miranumWorkspace);

        if (index === -1) {
            if (latestWorkspaces.length > 10) {
                latestWorkspaces.pop();
            }
            await storage.update("miranum-workspace", [miranumWorkspace, ...latestWorkspaces]);
            return true;
        }

        latestWorkspaces.splice(index, 1);
        await storage.update("miranum-workspace", [miranumWorkspace, ...latestWorkspaces]);

        return true;
    }

    closeWorkspace(miranumWorkspace: MiranumWorkspace): boolean {
        const index = this.miranumWorkspaces.indexOf(miranumWorkspace);
        if (index > -1) {
            this.miranumWorkspaces.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Filter workspaces with a miranum.json file
     */
    async filterWorkspaces(): Promise<boolean> {
        if (!workspace.workspaceFolders) {
            this.miranumWorkspaces = [];
            return true
        }

        const files = await workspace.findFiles("**/miranum.json");
        for (const ws of workspace.workspaceFolders) {
            for (const file of files) {
                if (file.path.startsWith(ws.uri.path)) {
                    this.miranumWorkspaces.push(new MiranumWorkspace(ws.name, ws.uri.path));
                }
            }
        }

        return true
    }
}

/**
 * @class WebviewAdapter
 */
export class WebviewAdapter implements WebviewOutPort {

    private webview?: WelcomeWebview;

    setWebview(webview: WelcomeWebview): boolean {
        this.webview = webview;
        return true;
    }

    openWebview(): boolean {
        this.webview?.create()
        return true;
    }

    closeWebview(): boolean {
        this.webview?.close();
        this.webview = undefined;
        return true;
    }

    async postMessage(type: string, data?: MiranumWorkspace[] | string): Promise<boolean> {
        const msg: VscMessage<MiranumWorkspace[] | string> = {
            type,
            data
        }

        return this.webview?.webview.postMessage(msg) ?? false;
    }
}
