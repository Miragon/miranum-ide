import "reflect-metadata";
import { container } from "tsyringe";
import { ExtensionContext } from "vscode";

import {EXTENSION_CONTEXT} from "./common";
import {config} from "./main.config";
import {WorkspaceAdapter} from "./adapter/in";

export async function activate(context: ExtensionContext) {
    await config();

    EXTENSION_CONTEXT.setContext(context);

    container.resolve(WorkspaceAdapter).initWorkspaces();
}
