import { posix } from "path";

import { WorkspacePort } from "../domain/hostPorts";

/**
 * Walks upward from `startDir` to the nearest directory holding a `.git` entry
 * (a directory in a clone, a file in worktrees and submodules). `undefined` at
 * the filesystem root or at the first directory that cannot be read.
 */
export async function findGitRoot(
    workspace: Pick<WorkspacePort, "readDirectory">,
    startDir: string,
): Promise<string | undefined> {
    let current = startDir;
    while (true) {
        let entries: [string, "file" | "directory"][];
        try {
            entries = await workspace.readDirectory(current);
        } catch {
            return undefined;
        }
        if (entries.some(([name]) => name === ".git")) {
            return current;
        }

        const parent = posix.dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}
