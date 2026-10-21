import { describe, expect, it } from "vitest";

import { DirectoryNotFound } from "../domain/errors";
import { findGitRoot } from "./findGitRoot";

type Entry = [string, "file" | "directory"];

/** Directory listings by path; a path without a listing is unreadable. */
function workspaceWith(listings: Record<string, Entry[]>) {
    const visited: string[] = [];
    return {
        visited,
        async readDirectory(path: string): Promise<Entry[]> {
            visited.push(path);
            const entries = listings[path];
            if (entries === undefined) {
                throw new DirectoryNotFound(path);
            }
            return entries;
        },
    };
}

describe("findGitRoot", () => {
    it("returns the start directory when it holds the repository", async () => {
        const workspace = workspaceWith({ "/repo": [[".git", "directory"]] });

        await expect(findGitRoot(workspace, "/repo")).resolves.toBe("/repo");
    });

    it("walks up to the nearest ancestor holding the repository", async () => {
        const workspace = workspaceWith({
            "/repo/processes/orders": [["order.bpmn", "file"]],
            "/repo/processes": [["orders", "directory"]],
            "/repo": [
                [".git", "directory"],
                ["processes", "directory"],
            ],
            "/": [[".git", "directory"]],
        });

        await expect(findGitRoot(workspace, "/repo/processes/orders")).resolves.toBe("/repo");
    });

    it("recognises the .git file of a worktree or submodule", async () => {
        const workspace = workspaceWith({
            "/worktrees/feature/src": [],
            "/worktrees/feature": [[".git", "file"]],
        });

        await expect(findGitRoot(workspace, "/worktrees/feature/src")).resolves.toBe(
            "/worktrees/feature",
        );
    });

    it("gives up at the filesystem root when no repository encloses the directory", async () => {
        const workspace = workspaceWith({ "/tmp/loose": [], "/tmp": [], "/": [] });

        await expect(findGitRoot(workspace, "/tmp/loose")).resolves.toBeUndefined();
        expect(workspace.visited).toEqual(["/tmp/loose", "/tmp", "/"]);
    });

    it("stops at the first directory it cannot read", async () => {
        const workspace = workspaceWith({ "/repo/sub": [], "/": [[".git", "directory"]] });

        await expect(findGitRoot(workspace, "/repo/sub")).resolves.toBeUndefined();
        expect(workspace.visited).toEqual(["/repo/sub", "/repo"]);
    });
});
