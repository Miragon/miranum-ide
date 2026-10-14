import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `BpmnElementTemplatesService` imports `EditorSessionStore`, which imports the
// `Disposable` *type* from vscode — erased at runtime, but the specifier must
// still resolve under vitest.
vi.mock("vscode", () => ({}));

import { ElementTemplatesQuery } from "@miragon/bpmn-modeler-shared";

import { BpmnElementTemplatesService } from "./BpmnElementTemplatesService";

const ROOT_TEMPLATES = "/work/.camunda/element-templates";
const NESTED_TEMPLATES = "/work/sub/.camunda/element-templates";
const EDITOR = "/work/diagram.bpmn";
const SECOND_EDITOR = "/work/other.bpmn";
const NESTED_EDITOR = "/work/sub/nested.bpmn";

/**
 * Wires the service to port doubles over an in-memory template tree: `dirFiles`
 * maps a template directory to its `.json` files, `fileContents` a file to its
 * JSON text. Every editor id doubles as its document path.
 */
function createService(options: { marketplace?: boolean } = {}) {
    const dirFiles = new Map<string, string[]>([[ROOT_TEMPLATES, []]]);
    const fileContents = new Map<string, string>();
    const editorStore = {
        postMessage: vi.fn().mockResolvedValue(true),
        hasEditor: vi.fn().mockReturnValue(true),
    };
    const vsDocument = { getFilePath: vi.fn((editorId: string) => editorId) };
    const artifactSvc = {
        getTemplateDirs: vi.fn(async (documentDir: string) =>
            [...dirFiles.keys()].filter((dir) =>
                documentDir.startsWith(dir.replace("/.camunda/element-templates", "")),
            ),
        ),
        readDirectory: vi.fn(async (dir: string) => [...(dirFiles.get(dir) ?? [])]),
        readFile: vi.fn(async (path: string) => {
            const content = fileContents.get(path);
            if (content === undefined) throw new Error(`ENOENT ${path}`);
            return content;
        }),
    };
    const statusBar = {
        showElementTemplatesLoading: vi.fn(),
        showElementTemplatesReady: vi.fn(),
        hideElementTemplatesStatus: vi.fn(),
    };
    const notifier = {
        notifyError: vi.fn(),
        logError: vi.fn(),
        logInfo: vi.fn(),
        logDebug: vi.fn(),
    };
    const marketplaceSvc = { getCachedTemplatePaths: vi.fn().mockResolvedValue([]) };

    const service = new BpmnElementTemplatesService(
        editorStore as never,
        vsDocument as never,
        artifactSvc as never,
        statusBar as never,
        notifier as never,
        options.marketplace === false ? undefined : (marketplaceSvc as never),
    );

    const addTemplate = (dir: string, file: string, template: unknown) => {
        const path = `${dir}/${file}`;
        dirFiles.set(dir, [...(dirFiles.get(dir) ?? []), path]);
        fileContents.set(path, JSON.stringify(template));
        return path;
    };

    const postedNames = (): string[] => {
        const calls = editorStore.postMessage.mock.calls;
        const query = calls[calls.length - 1][1] as ElementTemplatesQuery;
        return (query.elementTemplates as unknown as { name: string }[]).map((t) => t.name);
    };

    return {
        service,
        editorStore,
        artifactSvc,
        statusBar,
        notifier,
        marketplaceSvc,
        fileContents,
        addTemplate,
        postedNames,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("BpmnElementTemplatesService.setElementTemplates", () => {
    it("loads, name-sorts, and posts templates, then reports readiness", async () => {
        const { service, addTemplate, postedNames, statusBar, notifier } = createService();
        addTemplate(ROOT_TEMPLATES, "b.json", { name: "Zebra" });
        addTemplate(ROOT_TEMPLATES, "a.json", { name: "Apple" });

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(true);
        expect(statusBar.showElementTemplatesLoading).toHaveBeenCalledOnce();
        expect(postedNames()).toEqual(["Apple", "Zebra"]);
        expect(statusBar.showElementTemplatesReady).toHaveBeenCalledWith(2);
        expect(notifier.logInfo).toHaveBeenCalledOnce();
    });

    it("merges cached marketplace templates with workspace-local ones, name-sorted", async () => {
        const { service, addTemplate, postedNames, artifactSvc, marketplaceSvc, fileContents } =
            createService();
        const local = addTemplate(ROOT_TEMPLATES, "local.json", { name: "Local" });
        marketplaceSvc.getCachedTemplatePaths.mockResolvedValue(["/cache/remote.json"]);
        fileContents.set("/cache/remote.json", JSON.stringify([{ name: "Aremote" }]));

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(true);
        expect(artifactSvc.readFile).toHaveBeenCalledWith(local);
        expect(artifactSvc.readFile).toHaveBeenCalledWith("/cache/remote.json");
        expect(postedNames()).toEqual(["Aremote", "Local"]);
    });

    it("works without a marketplace service (workspace-only host)", async () => {
        const { service, addTemplate, editorStore } = createService({ marketplace: false });
        addTemplate(ROOT_TEMPLATES, "local.json", { name: "Local" });

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(true);
        const query = editorStore.postMessage.mock.calls[0][1] as ElementTemplatesQuery;
        expect(query.elementTemplates).toEqual([{ name: "Local" }]);
    });

    it("skips and logs a file that fails to parse, keeping the rest", async () => {
        const { service, addTemplate, postedNames, fileContents, notifier } = createService();
        addTemplate(ROOT_TEMPLATES, "ok.json", [{ name: "Good" }]);
        const broken = addTemplate(ROOT_TEMPLATES, "broken.json", {});
        fileContents.set(broken, "{ not json");

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(true);
        expect(notifier.logError).toHaveBeenCalledOnce();
        expect(postedNames()).toEqual(["Good"]);
    });

    it("does not log readiness info when there are no template files", async () => {
        const { service, statusBar, notifier } = createService();

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(true);
        expect(statusBar.showElementTemplatesReady).toHaveBeenCalledWith(0);
        expect(notifier.logInfo).not.toHaveBeenCalled();
    });

    it("hides the status and notifies when the post is rejected by the webview", async () => {
        const { service, editorStore, statusBar, notifier } = createService();
        editorStore.postMessage.mockResolvedValue(false);

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(false);
        expect(statusBar.hideElementTemplatesStatus).toHaveBeenCalledOnce();
        expect(notifier.notifyError).toHaveBeenCalledOnce();
    });

    it("hides the status and notifies when loading throws", async () => {
        const { service, artifactSvc, statusBar, notifier } = createService();
        artifactSvc.getTemplateDirs.mockRejectedValue(new Error("fs blew up"));

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(false);
        expect(statusBar.hideElementTemplatesStatus).toHaveBeenCalledOnce();
        expect(notifier.notifyError).toHaveBeenCalledOnce();
    });

    it("skips quietly for a disposed editor without touching the status bar or webview", async () => {
        const { service, editorStore, statusBar, notifier } = createService();
        editorStore.hasEditor.mockReturnValue(false);

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(false);
        expect(notifier.notifyError).not.toHaveBeenCalled();
        expect(editorStore.postMessage).not.toHaveBeenCalled();
        expect(statusBar.showElementTemplatesLoading).not.toHaveBeenCalled();
        expect(notifier.logDebug).toHaveBeenCalledOnce();
    });

    it("does not notify when the editor is disposed mid-load", async () => {
        const { service, editorStore, artifactSvc, notifier } = createService();
        // Editor is present at entry but gone by the time the awaited read throws.
        editorStore.hasEditor.mockReturnValueOnce(true).mockReturnValue(false);
        artifactSvc.getTemplateDirs.mockRejectedValue(new Error("read raced a close"));

        const result = await service.setElementTemplates(EDITOR);

        expect(result).toBe(false);
        expect(notifier.notifyError).not.toHaveBeenCalled();
        expect(notifier.logDebug).toHaveBeenCalledOnce();
    });
});

describe("BpmnElementTemplatesService template cache", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("serves a second editor in the same directory without reading from disk or flashing the status bar", async () => {
        const { service, addTemplate, postedNames, artifactSvc, marketplaceSvc, statusBar } =
            createService();
        addTemplate(ROOT_TEMPLATES, "a.json", { name: "Apple" });
        await service.setElementTemplates(EDITOR);
        vi.clearAllMocks();

        await service.setElementTemplates(SECOND_EDITOR);

        expect(artifactSvc.readDirectory).not.toHaveBeenCalled();
        expect(artifactSvc.readFile).not.toHaveBeenCalled();
        expect(marketplaceSvc.getCachedTemplatePaths).not.toHaveBeenCalled();
        expect(statusBar.showElementTemplatesLoading).not.toHaveBeenCalled();
        expect(statusBar.showElementTemplatesReady).not.toHaveBeenCalled();
        expect(postedNames()).toEqual(["Apple"]);
    });

    it("reads only the directories a nested editor adds", async () => {
        const { service, addTemplate, postedNames, artifactSvc } = createService();
        addTemplate(ROOT_TEMPLATES, "root.json", { name: "Root" });
        addTemplate(NESTED_TEMPLATES, "near.json", { name: "Near" });
        await service.setElementTemplates(EDITOR);
        vi.clearAllMocks();

        await service.setElementTemplates(NESTED_EDITOR);

        expect(artifactSvc.readDirectory.mock.calls).toEqual([[NESTED_TEMPLATES, ".json"]]);
        expect(postedNames()).toEqual(["Near", "Root"]);
    });

    it("shares one load between concurrent editors", async () => {
        const { service, addTemplate, artifactSvc } = createService();
        const file = addTemplate(ROOT_TEMPLATES, "a.json", { name: "Apple" });

        await Promise.all([
            service.setElementTemplates(EDITOR),
            service.setElementTemplates(SECOND_EDITOR),
        ]);

        expect(artifactSvc.readFile.mock.calls.filter(([path]) => path === file)).toHaveLength(1);
    });

    it("coalesces watcher refreshes into one re-read that reaches every editor", async () => {
        vi.useFakeTimers();
        const { service, addTemplate, artifactSvc, editorStore, fileContents } = createService();
        const file = addTemplate(ROOT_TEMPLATES, "a.json", { name: "Apple" });
        await service.setElementTemplates(EDITOR);
        await service.setElementTemplates(SECOND_EDITOR);
        fileContents.set(file, JSON.stringify({ name: "Avocado" }));
        vi.clearAllMocks();

        service.refreshElementTemplates(EDITOR);
        service.refreshElementTemplates(SECOND_EDITOR);
        await vi.advanceTimersByTimeAsync(150);

        expect(artifactSvc.readFile.mock.calls.filter(([path]) => path === file)).toHaveLength(1);
        const posted = editorStore.postMessage.mock.calls.map(([editorId, query]) => [
            editorId,
            (query as ElementTemplatesQuery).elementTemplates,
        ]);
        expect(posted).toEqual([
            [EDITOR, [{ name: "Avocado" }]],
            [SECOND_EDITOR, [{ name: "Avocado" }]],
        ]);
    });

    it("re-reads only marketplace templates on a marketplace reload", async () => {
        const { service, addTemplate, artifactSvc, marketplaceSvc, editorStore, fileContents } =
            createService();
        addTemplate(ROOT_TEMPLATES, "a.json", { name: "Apple" });
        marketplaceSvc.getCachedTemplatePaths.mockResolvedValue(["/cache/remote.json"]);
        fileContents.set("/cache/remote.json", JSON.stringify({ name: "Remote" }));
        await service.setElementTemplates(EDITOR);
        vi.clearAllMocks();

        await service.reloadMarketplaceTemplates();

        expect(artifactSvc.readDirectory).not.toHaveBeenCalled();
        expect(artifactSvc.readFile.mock.calls).toEqual([["/cache/remote.json"]]);
        expect(editorStore.postMessage.mock.calls.map(([editorId]) => editorId)).toEqual([EDITOR]);
    });

    it("reloads only editors that requested templates, and none once released", async () => {
        const { service, editorStore } = createService();
        await service.setElementTemplates(EDITOR);
        await service.setElementTemplates(SECOND_EDITOR);
        service.releaseEditor(SECOND_EDITOR);
        vi.clearAllMocks();

        await service.reloadMarketplaceTemplates();

        expect(editorStore.postMessage.mock.calls.map(([editorId]) => editorId)).toEqual([EDITOR]);
    });

    it("does not post templates of a request that a newer one superseded", async () => {
        const { service, addTemplate, artifactSvc, editorStore } = createService();
        addTemplate(ROOT_TEMPLATES, "a.json", { name: "Apple" });
        let releaseFirstLookup!: () => void;
        artifactSvc.getTemplateDirs.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    releaseFirstLookup = () => resolve([ROOT_TEMPLATES]);
                }),
        );

        const superseded = service.setElementTemplates(EDITOR);
        await service.setElementTemplates(EDITOR);
        releaseFirstLookup();

        await expect(superseded).resolves.toBe(false);
        expect(editorStore.postMessage).toHaveBeenCalledOnce();
    });

    it("does not keep a failed directory load", async () => {
        const { service, addTemplate, artifactSvc, notifier } = createService();
        addTemplate(ROOT_TEMPLATES, "a.json", { name: "Apple" });
        artifactSvc.readDirectory.mockRejectedValueOnce(new Error("EACCES"));

        await expect(service.setElementTemplates(EDITOR)).resolves.toBe(false);
        expect(notifier.notifyError).toHaveBeenCalledOnce();

        await expect(service.setElementTemplates(EDITOR)).resolves.toBe(true);
        expect(artifactSvc.readDirectory).toHaveBeenCalledTimes(2);
    });

    it("re-reads a directory once no open editor watches it any more", async () => {
        const { service, addTemplate, artifactSvc, marketplaceSvc } = createService();
        addTemplate(ROOT_TEMPLATES, "a.json", { name: "Apple" });
        await service.setElementTemplates(EDITOR);
        await service.setElementTemplates(SECOND_EDITOR);

        service.releaseEditor(EDITOR);
        vi.clearAllMocks();
        await service.setElementTemplates(EDITOR);
        expect(artifactSvc.readDirectory).not.toHaveBeenCalled();

        service.releaseEditor(EDITOR);
        service.releaseEditor(SECOND_EDITOR);
        await service.setElementTemplates(EDITOR);
        expect(artifactSvc.readDirectory).toHaveBeenCalledOnce();
        expect(marketplaceSvc.getCachedTemplatePaths).toHaveBeenCalledOnce();
    });
});
