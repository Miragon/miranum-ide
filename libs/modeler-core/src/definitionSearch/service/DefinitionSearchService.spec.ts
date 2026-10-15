import { describe, expect, it, vi } from "vitest";

import {
    SearchWorkspaceDefinitionsCommand,
    WorkspaceDefinitionsQuery,
} from "@miragon/bpmn-modeler-shared";

import { DefinitionSearchService } from "./DefinitionSearchService";
import { WorkspaceDefinitionIndex } from "./WorkspaceDefinitionIndex";

interface WatchHandlers {
    onChange?: (path: string) => void;
    onCreate?: (path: string) => void;
    onDelete?: (path: string) => void;
}

function model(definitions: string, usage = ""): string {
    return `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn:process id="p">${usage}</bpmn:process>${definitions}</bpmn:definitions>`;
}

function setup(initialFiles: Record<string, string>) {
    const files = new Map(Object.entries(initialFiles));
    const watchers: WatchHandlers[] = [];
    const disposeWatcher = vi.fn();
    const workspace = {
        findWorkspaceFolderForDocument: vi.fn(() => "/work"),
        getWorkspaceFolderPaths: vi.fn(() => ["/work"]),
        getDocumentDirectory: vi.fn(() => "/work"),
        findFiles: vi.fn(async () => [...files.keys()]),
        readFile: vi.fn(async (path: string) => {
            const content = files.get(path);
            if (content === undefined) throw new Error("FileNotFound");
            return content;
        }),
        readDirectory: vi.fn(async () => []),
        createWatcher: vi.fn((_root: string, _glob: string, handlers: WatchHandlers) => {
            watchers.push(handlers);
            return { dispose: disposeWatcher };
        }),
    };
    const notifier = { logInfo: vi.fn(), logWarning: vi.fn(), logError: vi.fn() };
    const postMessage = vi.fn().mockResolvedValue(true);
    const document = { getFilePath: vi.fn(() => "/work/current.bpmn") };
    const index = new WorkspaceDefinitionIndex(workspace as never, notifier as never);
    const service = new DefinitionSearchService(
        { postMessage } as never,
        document as never,
        workspace as never,
        index,
        notifier as never,
    );

    const answer = async (kind: "message" | "signal" | "error" | "escalation", text: string) => {
        postMessage.mockClear();
        await service.search("editor", new SearchWorkspaceDefinitionsCommand(7, kind, text));
        const [[editorId, query]] = postMessage.mock.calls as [[string, WorkspaceDefinitionsQuery]];
        expect(editorId).toBe("editor");
        expect(query.requestId).toBe(7);
        return query;
    };
    const search = async (kind: "message" | "signal" | "error" | "escalation", text: string) =>
        (await answer(kind, text)).definitions;

    return { files, watchers, disposeWatcher, workspace, notifier, service, answer, search };
}

describe("DefinitionSearchService", () => {
    it("finds matching definitions in other models with their file and usages", async () => {
        const { search } = setup({
            "/work/current.bpmn": model('<bpmn:message id="M0" name="paid" />'),
            "/work/billing/pay.bpmn": model(
                '<bpmn:message id="M1" name="paid" /><bpmn:message id="M2" name="refunded" />',
                '<bpmn:endEvent id="E" name="Paid"><bpmn:messageEventDefinition messageRef="M1" /></bpmn:endEvent>',
            ),
        });

        expect(await search("message", "PAI")).toEqual([
            {
                kind: "message",
                name: "paid",
                code: undefined,
                source: { path: "billing/pay.bpmn", label: "pay.bpmn" },
                usages: [
                    { elementId: "E", elementName: "Paid", elementType: "endEvent", role: "throw" },
                ],
            },
        ]);
    });

    it("lists every definition of the kind for an empty query, sorted by name", async () => {
        const { search } = setup({
            "/work/a.bpmn": model(
                '<bpmn:signal id="S1" name="zeta" /><bpmn:message id="M" name="m" />',
            ),
            "/work/b.bpmn": model('<bpmn:signal id="S2" name="alpha" />'),
        });

        expect((await search("signal", "")).map(({ name }) => name)).toEqual(["alpha", "zeta"]);
    });

    it("re-reads a changed file and forgets a deleted one", async () => {
        const { files, watchers, workspace, search } = setup({
            "/work/a.bpmn": model('<bpmn:message id="M" name="before" />'),
            "/work/b.bpmn": model('<bpmn:message id="M" name="other" />'),
        });
        await search("message", "");

        files.set("/work/a.bpmn", model('<bpmn:message id="M" name="after" />'));
        watchers[0].onChange?.("/work/a.bpmn");
        files.delete("/work/b.bpmn");
        watchers[0].onDelete?.("/work/b.bpmn");

        expect((await search("message", "")).map(({ name }) => name)).toEqual(["after"]);
        expect(workspace.findFiles).toHaveBeenCalledTimes(2);
    });

    it("serves repeated searches from the index", async () => {
        const { workspace, search } = setup({
            "/work/a.bpmn": model('<bpmn:message id="M" name="x" />'),
        });

        await search("message", "x");
        await search("message", "");

        expect(workspace.findFiles).toHaveBeenCalledTimes(1);
        expect(workspace.readFile).toHaveBeenCalledTimes(1);
    });

    it("answers a failed search as failed, and retries on the next search", async () => {
        const { workspace, notifier, answer, search } = setup({
            "/work/a.bpmn": model('<bpmn:message id="M" name="x" />'),
        });
        workspace.findFiles.mockRejectedValueOnce(new Error("boom"));

        expect(await answer("message", "")).toMatchObject({ definitions: [], failed: true });
        expect(notifier.logError).toHaveBeenCalled();
        expect(await search("message", "")).toHaveLength(1);
    });

    it("answers a malformed search as failed without touching the workspace", async () => {
        const { workspace, answer } = setup({});

        expect(await answer("bogus" as "message", "x")).toMatchObject({ failed: true });
        expect(workspace.findFiles).not.toHaveBeenCalled();
    });

    it("stops watching once the last editor of the scope is released", async () => {
        const { service, disposeWatcher, search } = setup({});
        await search("message", "");

        service.releaseEditor("editor");

        expect(disposeWatcher).toHaveBeenCalledTimes(1);
    });
});
