import { FileType, Uri, workspace } from "vscode";
import { inject, singleton } from "tsyringe";

import {
    ReadElementTemplatesOutPort,
    ReadFormKeysOutPort,
    ReadMiranumJsonOutPort,
    VsCodeReadOutPort,
} from "../../application/ports/out";
import { MiranumConfig, MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

import { NoMiranumConfigFoundError } from "../../application/errors";

const fs = workspace.fs;

let miranumWorkspaceItems: MiranumWorkspaceItem[] = [
    {
        type: "element-template",
        path: "element-templates",
        extension: ".json",
    },
    {
        type: "form",
        path: "forms",
        extension: ".form",
    },
];

@singleton()
export class ReadMiranumJsonAdapter implements ReadMiranumJsonOutPort {
    constructor(
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
    ) {}

    async readMiranumJson(path: string): Promise<"workspace" | "default"> {
        const content = await this.vsCodeReadOutPort.readFile(path);
        if (content) {
            const json = JSON.parse(content) as MiranumConfig;
            miranumWorkspaceItems = json.workspace;
            return "workspace";
        }
        return "default";
    }
}

abstract class ReadArtifact {
    protected abstract readonly type: string;

    async getArtifacts(): Promise<string[]> {
        if (miranumWorkspaceItems.length === 0) {
            throw new NoMiranumConfigFoundError(this.type);
        }
        const config = miranumWorkspaceItems.find((item) => item.type === this.type);
        if (!config) {
            throw new NoMiranumConfigFoundError(this.type);
        }

        return getWorkspaceFiles(config.path, config.extension);
    }
}

@singleton()
export class ReadElementTemplatesAdapter
    extends ReadArtifact
    implements ReadElementTemplatesOutPort
{
    protected readonly type = "element-template";

    constructor(
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
    ) {
        super();
    }

    async readElementTemplates(): Promise<string[]> {
        const artifacts = await this.getArtifacts();

        return Promise.all(
            artifacts.map((artifact) => this.vsCodeReadOutPort.readFile(artifact)),
        );
    }
}

@singleton()
export class ReadDigiWfFormKeysAdapter
    extends ReadArtifact
    implements ReadFormKeysOutPort
{
    protected readonly type = "form";

    constructor(
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
    ) {
        super();
    }

    async readFormKeys(): Promise<string[]> {
        const artifacts = await this.getArtifacts();

        return Promise.all(
            artifacts.map((artifact) => this.vsCodeReadOutPort.readFile(artifact)),
        );
    }
}

// export class ReadJsonFormKeysAdapter implements ReadFormKeysOutPort {
//     private readonly extension = ".form.json";
//
//     async readFormKeys(path: string): Promise<string[]> {
//         if (miranumWorkspaceItems.length === 0) {
//             throw new Error("No workspace items found.");
//         }
//         throw new Error("Method not implemented.");
//     }
// }

export class VsCodeReadAdapter implements VsCodeReadOutPort {
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
        return fs.readFile(Uri.file(path)).then((buffer) => buffer.toString());
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
