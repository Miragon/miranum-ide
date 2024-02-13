import { FileType, Uri, workspace } from "vscode";

import {
    ReadElementTemplatesOutPort,
    ReadFormKeysOutPort,
    ReadMiranumJsonOutPort,
    VsCodeReadOutPort,
} from "../../application/ports/out";
import { MiranumConfig, MiranumWorkspaceItem } from "@miranum-ide/miranum-core";
import { NoMiranumConfigFoundError } from "../../application/errors";
import { inject, singleton } from "tsyringe";

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

@singleton()
export class ReadElementTemplatesAdapter implements ReadElementTemplatesOutPort {
    private readonly type = "element-template";

    constructor(
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
    ) {}

    async readElementTemplates(): Promise<string[]> {
        if (miranumWorkspaceItems.length === 0) {
            throw new NoMiranumConfigFoundError(this.type);
        }
        // Check if `miranumWorkspaceItems` has an item with the type `element-templates`
        const elementTemplateConfig = miranumWorkspaceItems.find(
            (item) => item.type === this.type,
        );
        if (!elementTemplateConfig) {
            throw new NoMiranumConfigFoundError(this.type);
        }

        const files = await getWorkspaceFiles(
            elementTemplateConfig.path,
            elementTemplateConfig.extension,
        );

        return Promise.all(files.map((file) => this.vsCodeReadOutPort.readFile(file)));
    }
}

@singleton()
export class ReadDigiWfFormKeysAdapter implements ReadFormKeysOutPort {
    private readonly type = "form";

    constructor(
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
    ) {}

    async readFormKeys(): Promise<string[]> {
        if (miranumWorkspaceItems.length === 0) {
            throw new NoMiranumConfigFoundError(this.type);
        }
        // Check if `miranumWorkspaceItems` has an item with the type `forms`
        const formConfig = miranumWorkspaceItems.find((item) => item.type === this.type);
        if (!formConfig) {
            throw new NoMiranumConfigFoundError(this.type);
        }

        const files = await getWorkspaceFiles(formConfig.path, formConfig.extension);

        return Promise.all(files.map((file) => this.vsCodeReadOutPort.readFile(file)));
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
        // return dir.map(([name, type]) => [name, this.parseFileType(type)]);
        return dir.flatMap(([name, type]) => {
            const t = this.parseFileType(type);
            if (t !== "file" && t !== "directory") {
                return [];
            }

            return [[name, t]];
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
