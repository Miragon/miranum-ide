import { FileType, Uri, workspace } from "vscode";

import {
    ReadDigiWfFormKeysOutPort,
    ReadElementTemplatesOutPort,
    ReadMiranumJsonOutPort,
} from "../../application/ports/out";

export class ReadMiranumJsonAdapter implements ReadMiranumJsonOutPort {
    private readonly name = "miranum.json";

    readMiranumJson(path: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
}

export class ReadElementTemplatesAdapter implements ReadElementTemplatesOutPort {
    private readonly extension = ".json";

    async readElementTemplates(path: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
}

export class ReadDigiWfFormKeysAdapter implements ReadDigiWfFormKeysOutPort {
    private readonly extension = ".form";

    async readFormKeys(path: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
}

const fs = workspace.fs;

async function getWorkspaceFiles(
    directory: string,
    extension: string,
): Promise<string[]> {
    const ws = await fs.readDirectory(Uri.file(directory));

    const files: string[] = [];
    for (const [name, type] of ws) {
        if (type === FileType.Directory) {
            files.push(...(await getWorkspaceFiles(`${directory}/${name}`, extension)));
        } else if (type === FileType.File && name.endsWith(extension)) {
            files.push(`${directory}/${name}`);
        }
    }
    return files;
}
