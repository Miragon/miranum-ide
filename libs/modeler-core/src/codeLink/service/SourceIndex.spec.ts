import { posix } from "path";

import { describe, expect, it, vi } from "vitest";

import { isSourceFile } from "../domain/ImplementationReference";
import { SourceIndex } from "./SourceIndex";

const FOLDER = "/ws";
const DOC = "/ws/order.bpmn";
const SECOND_DOC = "/ws/sub/invoice.bpmn";
const WORKER = "/ws/src/Worker.java";
const OTHER = "/ws/src/pkg/Other.java";

interface FakeWatcher {
    root: string;
    handlers: {
        onCreate: (path: string) => void;
        onChange: (path: string) => void;
        onDelete: (path: string) => void;
    };
    dispose: ReturnType<typeof vi.fn>;
}

/** A workspace whose files and folders tests change in place. */
function createWorkspace(initialFiles: Record<string, string>, initialFolders = [FOLDER]) {
    const files = { ...initialFiles };
    let folders = initialFolders;
    const watchers: FakeWatcher[] = [];
    const workspace = {
        findWorkspaceFolderForDocument: vi.fn((document: string) =>
            folders.find((folder) => document.startsWith(`${folder}/`)),
        ),
        getWorkspaceFolderPaths: vi.fn(() => folders),
        getDocumentDirectory: vi.fn((document: string) => posix.dirname(document)),
        findFiles: vi.fn(async () => Object.keys(files).filter(isSourceFile)),
        readDirectory: vi.fn(async () => []),
        readFile: vi.fn(async (path: string) => {
            if (!(path in files)) {
                throw new Error(`ENOENT ${path}`);
            }
            return files[path];
        }),
        createWatcher: vi.fn(
            (root: string, _glob: string, handlers: FakeWatcher["handlers"]): FakeWatcher => {
                const watcher = { root, handlers, dispose: vi.fn() };
                watchers.push(watcher);
                return watcher;
            },
        ),
    };
    const logger = { logInfo: vi.fn(), logWarning: vi.fn() };
    const index = new SourceIndex(workspace as never, logger);
    return {
        index,
        workspace,
        files,
        watchers,
        logger,
        setFolders: (next: string[]) => {
            folders = next;
        },
        readsOf: (path: string) => workspace.readFile.mock.calls.filter(([read]) => read === path),
    };
}

async function scan(index: SourceIndex, editorId: string, document: string): Promise<string[]> {
    const sources = index.sourcesFor(editorId, document)!;
    const paths = (await sources.listSources())!;
    await Promise.all(paths.map((path) => sources.inspect(path, false)));
    return paths;
}

describe("SourceIndex", () => {
    it("shares one listing and one read per file between editors of the same folders", async () => {
        const { index, workspace, readsOf } = createWorkspace({
            [WORKER]: `@JobWorker(type = "pay")`,
            [OTHER]: "class Other {}",
        });

        await scan(index, "editor1", DOC);
        const sources = index.sourcesFor("editor2", SECOND_DOC)!;
        const paths = await sources.listSources();
        const worker = await sources.inspect(WORKER, false);

        expect(paths).toEqual([WORKER, OTHER]);
        expect(worker?.facts.implementsLiteral("pay")).toBe(true);
        expect(workspace.findFiles).toHaveBeenCalledOnce();
        expect(readsOf(WORKER)).toHaveLength(1);
        expect(workspace.createWatcher).toHaveBeenCalledOnce();
        expect(workspace.createWatcher.mock.calls[0].slice(0, 2)).toEqual([FOLDER, "**/*"]);
    });

    it("re-reads only a file that changed", async () => {
        const { index, files, watchers, readsOf } = createWorkspace({
            [WORKER]: `"pay"`,
            [OTHER]: "class Other {}",
        });
        await scan(index, "editor1", DOC);

        files[WORKER] = `"refund"`;
        watchers[0].handlers.onChange(WORKER);
        await scan(index, "editor1", DOC);
        const worker = await index.sourcesFor("editor1", DOC)!.inspect(WORKER, false);

        expect(readsOf(WORKER)).toHaveLength(2);
        expect(readsOf(OTHER)).toHaveLength(1);
        expect(worker?.facts.implementsLiteral("refund")).toBe(true);
    });

    it("lists again after a new source file without re-reading the known ones", async () => {
        const created = "/ws/src/Created.java";
        const { index, files, watchers, workspace, readsOf } = createWorkspace({
            [WORKER]: `"pay"`,
        });
        await scan(index, "editor1", DOC);

        files[created] = `"new"`;
        watchers[0].handlers.onCreate(created);
        const paths = await scan(index, "editor1", DOC);

        expect(paths).toEqual([WORKER, created]);
        expect(workspace.findFiles).toHaveBeenCalledTimes(2);
        expect(readsOf(WORKER)).toHaveLength(1);
    });

    it("treats a create event for a listed file as a change", async () => {
        const { index, watchers, workspace, readsOf } = createWorkspace({ [WORKER]: `"pay"` });
        await scan(index, "editor1", DOC);

        watchers[0].handlers.onCreate(WORKER);
        await scan(index, "editor1", DOC);

        expect(workspace.findFiles).toHaveBeenCalledOnce();
        expect(readsOf(WORKER)).toHaveLength(2);
    });

    it("lists again after a delete and reads the files of a re-created folder afresh", async () => {
        const { index, files, watchers, workspace, readsOf } = createWorkspace({
            [WORKER]: `"pay"`,
            [OTHER]: `"old"`,
            "/ws/src/Kept.java": "class Kept {}",
        });
        await scan(index, "editor1", DOC);

        delete files[WORKER];
        watchers[0].handlers.onDelete(WORKER);
        watchers[0].handlers.onDelete("/ws/src/pkg");
        files[OTHER] = `"new"`;
        watchers[0].handlers.onCreate("/ws/src/pkg");
        const paths = await scan(index, "editor1", DOC);
        const other = await index.sourcesFor("editor1", DOC)!.inspect(OTHER, false);

        expect(paths).toEqual([OTHER, "/ws/src/Kept.java"]);
        expect(workspace.findFiles).toHaveBeenCalledTimes(2);
        expect(other?.facts.implementsLiteral("new")).toBe(true);
        expect(readsOf("/ws/src/Kept.java")).toHaveLength(1);
    });

    it("does not keep a read that a change overtook", async () => {
        const { index, workspace, watchers, readsOf } = createWorkspace({ [WORKER]: `"pay"` });
        let releaseRead!: (content: string) => void;
        workspace.readFile.mockImplementationOnce(
            () =>
                new Promise<string>((resolve) => {
                    releaseRead = resolve;
                }),
        );
        const sources = index.sourcesFor("editor1", DOC)!;

        const staleRead = sources.inspect(WORKER, false);
        watchers[0].handlers.onChange(WORKER);
        releaseRead(`"stale"`);
        await staleRead;
        const fresh = await sources.inspect(WORKER, false);

        expect(readsOf(WORKER)).toHaveLength(2);
        expect(fresh?.facts.implementsLiteral("pay")).toBe(true);
    });

    it("matches watcher paths that use backslash separators", async () => {
        const folder = "C:/ws";
        const file = "C:/ws/src/Worker.java";
        const { index, watchers, readsOf } = createWorkspace({ [file]: `"pay"` }, [folder]);
        await scan(index, "editor1", "C:/ws/order.bpmn");

        watchers[0].handlers.onChange("C:\\ws\\src\\Worker.java");
        await scan(index, "editor1", "C:/ws/order.bpmn");

        expect(readsOf(file)).toHaveLength(2);
    });

    it("judges excluded directories relative to the watched folder", async () => {
        const file = "/home/build/ws/src/Worker.java";
        const { index, watchers, readsOf } = createWorkspace({ [file]: `"pay"` }, [
            "/home/build/ws",
        ]);
        const sources = index.sourcesFor("editor1", "/home/build/ws/order.bpmn")!;
        await sources.inspect(file, false);

        watchers[0].handlers.onChange(file);
        await sources.inspect(file, false);

        expect(readsOf(file)).toHaveLength(2);
    });

    it("ignores changes inside excluded directories", async () => {
        const { index, watchers, workspace } = createWorkspace({ [WORKER]: `"pay"` });
        await scan(index, "editor1", DOC);

        watchers[0].handlers.onCreate("/ws/target/classes/Generated.java");
        await scan(index, "editor1", DOC);

        expect(workspace.findFiles).toHaveBeenCalledOnce();
    });

    it("returns the content only when asked and never keeps it", async () => {
        const { index } = createWorkspace({ [WORKER]: `"pay"` });
        const sources = index.sourcesFor("editor1", DOC)!;

        const withoutContent = await sources.inspect(WORKER, false);
        const withContent = await sources.inspect(WORKER, true);

        expect(withoutContent?.content).toBeUndefined();
        expect(withContent?.content).toBe(`"pay"`);
    });

    it("disposes the watchers with the last editor", async () => {
        const { index, watchers } = createWorkspace({ [WORKER]: `"pay"` });
        index.sourcesFor("editor1", DOC);
        index.sourcesFor("editor2", SECOND_DOC);

        index.release("editor1");
        expect(watchers[0].dispose).not.toHaveBeenCalled();

        index.release("editor2");
        expect(watchers[0].dispose).toHaveBeenCalledOnce();
    });

    it("moves an editor to a new index when the workspace folders change", async () => {
        const { index, watchers, setFolders } = createWorkspace({ [WORKER]: `"pay"` });
        const before = index.sourcesFor("editor1", DOC);

        setFolders([FOLDER, "/other"]);
        const after = index.sourcesFor("editor1", DOC);

        expect(after).not.toBe(before);
        expect(watchers[0].dispose).toHaveBeenCalledOnce();
        expect(watchers.map((watcher) => watcher.root)).toEqual([FOLDER, FOLDER, "/other"]);
    });

    it("shares nothing for a document outside every workspace folder", () => {
        const { index, workspace } = createWorkspace({ [WORKER]: `"pay"` });

        expect(index.sourcesFor("editor1", "/loose/diagram.bpmn")).toBeUndefined();
        expect(workspace.createWatcher).not.toHaveBeenCalled();
    });

    it("falls back to unshared searches when the folders cannot be watched", () => {
        const { index, workspace, logger } = createWorkspace({ [WORKER]: `"pay"` });
        workspace.createWatcher.mockImplementationOnce(() => {
            throw new Error("watch limit reached");
        });

        expect(index.sourcesFor("editor1", DOC)).toBeUndefined();
        expect(logger.logWarning).toHaveBeenCalledOnce();
    });
});
