import { Uri, workspace } from "vscode";
import { singleton } from "tsyringe";

import { getContent, getFilePath } from "../helper/vscode";
import { DocumentOutPort, WorkspaceOutPort } from "../../application/ports/out";
import { NoWorkspaceFolderFoundError } from "../../application/errors";

@singleton()
export class MiranumWorkspaceAdapter implements WorkspaceOutPort {
    async getMiranumConfigForDocument(document: string): Promise<string[]> {
        const workspaceFolders = this.getWorkspaceFoldersWithMiranumConfig();
        const workspaceFolder = this.getWorkspaceFolderForDocument(document);

        const ws = (await workspaceFolders).find((folder) => folder === workspaceFolder);

        if (!ws) {
            // undefined = document is in a workspace without a miranum.json
            return [];
        }

        return (await workspace.findFiles(`${ws}/**/miranum.json`)).map(
            (uri) => uri.path,
        );
    }

    getWorkspaceFolderForDocument(document: string): string {
        const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(document));
        if (!workspaceFolder) {
            throw new NoWorkspaceFolderFoundError();
        }
        return workspaceFolder.uri.path;
    }

    async getWorkspaceFoldersWithMiranumConfig(): Promise<string[]> {
        if (!workspace.workspaceFolders) {
            return [];
        }

        const uris = await workspace.findFiles("**/miranum.json");

        return uris
            .map((uri) => workspace.getWorkspaceFolder(uri)?.uri.path)
            .filter((workspaceFolder): workspaceFolder is string => !!workspaceFolder);
    }
}

@singleton()
export class MiranumDocumentAdapter implements DocumentOutPort {
    getContent(): string {
        return getContent();
    }

    getFilePath(): string {
        return getFilePath();
    }
}
