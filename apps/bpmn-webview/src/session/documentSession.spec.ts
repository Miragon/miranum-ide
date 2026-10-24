import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    BpmnFileQuery,
    type Command,
    createInertLockGroup,
    type Query,
} from "@miragon/bpmn-modeler-shared";

import { BpmnDocumentSession, type BpmnDocumentSurface } from "./documentSession";

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => (resolve = done));
    return { promise, resolve };
}

function makeSurface(overrides: Partial<BpmnDocumentSurface> = {}) {
    const surface = {
        engine: vi.fn(() => "c7" as const),
        importHostDocument: vi.fn(async (_content: string | undefined) => {}),
        exportDocument: vi.fn(async () => "<exported />"),
        afterSync: vi.fn(),
        refreshDiagram: vi.fn(async () => {}),
        centerOnElement: vi.fn(),
        cancelPendingVariablePublish: vi.fn(),
        flushViewport: vi.fn(),
        destroy: vi.fn(),
        reload: vi.fn(),
        ...overrides,
    };
    return surface;
}

function setup(overrides: Partial<BpmnDocumentSurface> = {}) {
    const posted: (Command | Query)[] = [];
    const surface = makeSurface(overrides);
    const session = new BpmnDocumentSession(
        { postMessage: (m) => posted.push(m) },
        surface,
        createInertLockGroup(document.body),
    );
    return { session, surface, posted };
}

const hostFile = (content: string, revision: number, engine: "c7" | "c8" = "c7") =>
    new BpmnFileQuery(content, engine, "modeler", revision);

async function openSession(setupResult: ReturnType<typeof setup>, revision = 1) {
    const { session } = setupResult;
    void session.receiveHostFile(hostFile("<initial />", revision));
    const first = await session.waitForInitialHostFile();
    await session.openInitialDocument(first);
    session.markInitialized();
    session.markSurfaceReady();
}

const syncCommands = (posted: (Command | Query)[]) =>
    posted.filter((message) => message.type === "SyncDocumentCommand") as unknown as {
        content: string;
        documentRevision: number;
    }[];

describe("BpmnDocumentSession", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        document.body.inert = false;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("hands the first host file to the boot and imports it at its revision", async () => {
        const context = setup();

        await openSession(context, 4);

        expect(context.surface.importHostDocument).toHaveBeenCalledWith("<initial />");
        expect(context.session.documentRevision()).toBe(4);
        expect(context.session.isReady()).toBe(true);
    });

    it("ignores a host file older than the latest one", async () => {
        const context = setup();
        await openSession(context, 5);

        await context.session.receiveHostFile(hostFile("<old />", 3));
        await vi.runAllTimersAsync();

        expect(context.surface.importHostDocument).not.toHaveBeenCalledWith("<old />");
        expect(context.session.hostUpdateVersion()).toBe(1);
    });

    it("queues a host push that arrives during a mode switch and replays it afterwards", async () => {
        const context = setup();
        await openSession(context);
        const modeSwitch = deferred();
        context.session.requestMode(() => modeSwitch.promise);

        const pushed = context.session.receiveHostFile(hostFile("<pushed />", 2));
        await vi.advanceTimersByTimeAsync(500);
        expect(context.surface.importHostDocument).not.toHaveBeenCalledWith("<pushed />");

        modeSwitch.resolve();
        await vi.runAllTimersAsync();
        await pushed;

        expect(context.surface.importHostDocument).toHaveBeenLastCalledWith("<pushed />");
        expect(context.session.documentRevision()).toBe(2);
    });

    it("drops a mode request until the initial surface is ready", async () => {
        const context = setup();
        const switchMode = vi.fn(async () => {});

        context.session.requestMode(switchMode);
        await vi.runAllTimersAsync();

        expect(switchMode).not.toHaveBeenCalled();
    });

    it("drops a mode request while a switch is in flight and makes the page inert", async () => {
        const context = setup();
        await openSession(context);
        const switchMode = vi.fn(async () => {});

        context.session.setSwitching(true);
        context.session.requestMode(switchMode);
        await vi.runAllTimersAsync();

        expect(switchMode).not.toHaveBeenCalled();
        expect(document.body.inert).toBe(true);
        context.session.setSwitching(false);
        expect(document.body.inert).toBe(false);
    });

    it("syncs a local change at the represented revision", async () => {
        const context = setup();
        await openSession(context, 3);

        context.session.scheduleSync();
        await vi.runAllTimersAsync();

        expect(syncCommands(context.posted)).toEqual([
            expect.objectContaining({ content: "<exported />", documentRevision: 3 }),
        ]);
        expect(context.surface.afterSync).toHaveBeenCalledOnce();
    });

    it("drops an export that a host push overtook", async () => {
        const exportStarted = deferred();
        const exportResult = deferred();
        const context = setup({
            exportDocument: vi.fn(async () => {
                exportStarted.resolve();
                await exportResult.promise;
                return "<stale />";
            }),
        });
        await openSession(context);

        context.session.scheduleSync();
        await vi.advanceTimersByTimeAsync(300);
        await exportStarted.promise;
        const pushed = context.session.receiveHostFile(hostFile("<pushed />", 2));
        exportResult.resolve();
        await vi.runAllTimersAsync();
        await pushed;

        expect(syncCommands(context.posted)).toEqual([]);
        expect(context.session.documentRevision()).toBe(2);
    });

    it("cancels a pending local sync when the host pushes", async () => {
        const context = setup();
        await openSession(context);

        context.session.scheduleSync();
        const pushed = context.session.receiveHostFile(hostFile("<pushed />", 2));
        await vi.runAllTimersAsync();
        await pushed;

        expect(context.surface.exportDocument).not.toHaveBeenCalled();
    });

    it("reloads the webview when a host push changes the engine", async () => {
        const context = setup();
        await openSession(context);

        await context.session.receiveHostFile(hostFile("<c8 />", 2, "c8"));

        expect(context.session.isReloadingForEngine).toBe(true);
        expect(context.session.isReady()).toBe(false);
        expect(context.surface.destroy).toHaveBeenCalledOnce();
        expect(context.surface.reload).toHaveBeenCalledOnce();
        expect(context.surface.importHostDocument).not.toHaveBeenCalledWith("<c8 />");
        expect(document.body.inert).toBe(true);
    });

    it("stops the boot when the initial file targets another engine", async () => {
        const context = setup({ engine: vi.fn(() => "c8" as const) });
        void context.session.receiveHostFile(hostFile("<c7 />", 1));

        const proceed = await context.session.openInitialDocument(
            await context.session.waitForInitialHostFile(),
        );

        expect(proceed).toBe(false);
        expect(context.surface.reload).toHaveBeenCalledOnce();
    });

    it("imports a host push that arrived during the initial import right after it", async () => {
        const initialImport = deferred();
        const context = setup();
        vi.mocked(context.surface.importHostDocument).mockImplementationOnce(
            () => initialImport.promise,
        );
        void context.session.receiveHostFile(hostFile("<initial />", 1));

        const opening = context.session.openInitialDocument(
            await context.session.waitForInitialHostFile(),
        );
        await context.session.receiveHostFile(hostFile("<pushed />", 2));
        initialImport.resolve();
        await vi.runAllTimersAsync();

        expect(await opening).toBe(true);
        expect(context.surface.importHostDocument).toHaveBeenLastCalledWith("<pushed />");
        expect(context.session.documentRevision()).toBe(2);
    });

    it("defers focus and diagram refresh until the modeler is initialized", async () => {
        const context = setup();
        void context.session.receiveHostFile(hostFile("<initial />", 1));
        await context.session.openInitialDocument(await context.session.waitForInitialHostFile());

        await context.session.focusElement("Task_1");
        await context.session.requestDiagramRefresh();
        expect(context.surface.centerOnElement).not.toHaveBeenCalled();
        expect(context.surface.refreshDiagram).not.toHaveBeenCalled();

        context.session.markInitialized();
        await context.session.drainPendingActions();

        expect(context.surface.refreshDiagram).toHaveBeenCalledOnce();
        expect(context.surface.centerOnElement).toHaveBeenCalledWith("Task_1");
    });

    it("never refreshes a diff viewer pane", async () => {
        const context = setup();
        void context.session.receiveHostFile(new BpmnFileQuery("<x />", "c7", "viewer", 1));
        context.session.markInitialized();

        await context.session.requestDiagramRefresh();

        expect(context.surface.refreshDiagram).not.toHaveBeenCalled();
    });

    it("restores interaction after a declined destructive flush", () => {
        const context = setup();

        context.session.beginDestructiveFlush();
        expect(document.body.inert).toBe(true);
        context.session.endDestructiveFlush();

        expect(document.body.inert).toBe(false);
    });
});
