import "reflect-metadata";
import { ExtensionContext } from "vscode";
import { container } from "tsyringe";

import { EXTENSION_CONTEXT } from "./common";
import { config } from "./main.config";
import { WebviewAdapter, WorkspaceAdapter } from "./adapter/in/vscode";

export async function activate(context: ExtensionContext) {
    await config();

    EXTENSION_CONTEXT.setContext(context);

    // Get open miranumWorkspaces
    const miranumWorkspaces = await container
        .resolve(WorkspaceAdapter)
        .getMiranumWorkspaces();

    if (miranumWorkspaces.length > 0) {
        // Create Views:
        //     - Workspaces
        //     - Artifact
        //     - Deployment
    } else {
        await container.resolve(WebviewAdapter).createWebview();
    }

    // Create EventAdapter
}
