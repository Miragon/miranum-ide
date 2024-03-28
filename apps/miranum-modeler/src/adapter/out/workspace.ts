import { FileType, Uri, workspace } from "vscode";
import { singleton } from "tsyringe";
import {
    BpmnModelerSettingsOutPort,
    FileSystemOutPort,
    WorkspaceOutPort,
} from "../../application/ports/out";
import { FileNotFound, NoWorkspaceFolderFoundError } from "../../application/errors";

const fs = workspace.fs;

@singleton()
export class VsCodeWorkspaceAdapter implements WorkspaceOutPort {
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
export class VsCodeReadAdapter implements FileSystemOutPort {
    async readDirectory(path: string): Promise<[string, "file" | "directory"][]> {
        const dir = await fs.readDirectory(Uri.file(path));
        // flatMap {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap}
        return dir.flatMap(([name, type]) => {
            const t = this.parseFileType(type);
            if (t !== "file" && t !== "directory") {
                return []; // remove item
            }

            return [[name, t]]; // add item
        });
    }

    async readFile(path: string): Promise<string> {
        return fs.readFile(Uri.file(path)).then(
            (buffer) => buffer.toString(),
            (reason) => {
                // TODO: What is reason?
                throw new FileNotFound(reason);
            },
        );
    }

    private parseFileType(type: FileType): string {
        switch (type) {
            case FileType.File:
                return "file";
            case FileType.Directory:
                return "directory";
            case FileType.SymbolicLink:
                return "symbolicLink";
            default:
                return "unknown";
        }
    }
}

@singleton()
export class VsCodeBpmnModelerSettingsAdapter implements BpmnModelerSettingsOutPort {
    getAlignToOrigin(): boolean {
        const setting = workspace
            .getConfiguration("miranumIDE.modeler")
            .get<boolean>("alignToOrigin");

        if (!setting) {
            return false;
        }

        return setting;
    }
}
