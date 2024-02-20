import { FileType, Uri, workspace } from "vscode";

import { VsCodeReadOutPort } from "../../application/ports/out";
import { FileNotFound } from "../../application/errors";

const fs = workspace.fs;

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
