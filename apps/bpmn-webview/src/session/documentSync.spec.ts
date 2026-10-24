import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    BpmnFileQuery,
    type Command,
    FlushDocumentQuery,
    type Query,
    ReleaseDocumentFlushQuery,
} from "@miragon/bpmn-modeler-shared";

import type { SurfaceHandle } from "../surface";
import { BpmnDocumentSync } from "./documentSync";

type Posted = { type: string } & Record<string, unknown>;

function createHost() {
    const sent: (Command | Query)[] = [];
    return {
        postMessage: vi.fn((message: Command | Query) => {
            sent.push(message);
        }),
        ofType: (type: string) =>
            sent.filter((message) => message.type === type) as unknown as Posted[],
    };
}

const hostFile = (
    content: string,
    documentRevision: number,
    engine: "c7" | "c8" | undefined = "c7",
) => new BpmnFileQuery(content, engine, "modeler", documentRevision);

function deferred<T = void>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return { promise, resolve, reject };
}

function modelerSurface(overrides: Record<string, unknown> = {}) {
    return {
        setMode: vi.fn(),
        newDiagram: vi.fn(async () => ({ warnings: [] })),
        loadDiagram: vi.fn(async (_xml: string) => ({ warnings: [] as unknown[] })),
        exportDiagram: vi.fn(async () => "<exported />"),
        alignElementsToOrigin: vi.fn(),
        ...overrides,
    };
}

function designerSurface() {
    return {
        newDiagram: vi.fn(async () => ({ warnings: [] })),
        loadDiagram: vi.fn(async () => ({ warnings: [] })),
        exportDiagram: vi.fn(async () => "<designed />"),
    };
}

function viewerSurface() {
    return {
        loadDiagram: vi.fn(async () => ({ warnings: [] })),
        exportDiagram: vi.fn(async () => "<viewed />"),
    };
}

const viewSnapshot = {
    rootElementId: "SubProcess_1_plane",
    viewport: { x: 40, y: 20, width: 800, height: 600, scale: 1.5 },
    selectedElementIds: ["Task_1"],
};

function documentSyncOn(surface: object) {
    const host = createHost();
    const viewState = { captureViewState: vi.fn(() => viewSnapshot), applyViewState: vi.fn() };
    let boundViewState: typeof viewState | undefined;
    const flushLock = { acquire: vi.fn(), release: vi.fn() };
    const followUps = {
        reloadForEngineChange: vi.fn(async () => undefined),
        drainPendingActions: vi.fn(async () => undefined),
    };
    const sync = new BpmnDocumentSync(host, () => surface as unknown as SurfaceHandle, {
        getViewState: () => boundViewState,
        flushLock,
        followUps,
    });
    const bindViewState = () => {
        boundViewState = viewState;
    };
    return { host, sync, viewState, bindViewState, flushLock, followUps };
}

async function receiveInitial(
    context: ReturnType<typeof documentSyncOn>,
    initial: BpmnFileQuery,
): Promise<BpmnFileQuery | undefined> {
    await context.sync.receiveHostFile(initial);
    return context.sync.waitForInitialFile();
}

/** A session past its initial import, bound and ready like bootstrap leaves it. */
async function openedSession(surface: object, initial = hostFile("<initial />", 1)) {
    const context = documentSyncOn(surface);
    const opened = await context.sync.importInitial(await receiveInitial(context, initial));
    expect(opened).toBe(true);
    context.bindViewState();
    context.sync.markReady();
    return context;
}

async function pushUpdate(sync: BpmnDocumentSync, file: BpmnFileQuery): Promise<void> {
    const received = sync.receiveHostFile(file);
    await vi.advanceTimersByTimeAsync(100);
    await received;
}

describe("BpmnDocumentSync", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("initial import", () => {
        it("opens the initial document and represents its revision", async () => {
            const surface = modelerSurface();
            const { sync } = await openedSession(surface, hostFile("<initial />", 4));

            expect(surface.loadDiagram).toHaveBeenCalledExactlyOnceWith("<initial />");
            expect(sync.documentRevision()).toBe(4);
        });

        it("opens only the newest document when one overtook the initial reply", async () => {
            const surface = modelerSurface();
            const context = documentSyncOn(surface);
            const initialFile = await receiveInitial(context, hostFile("<initial />", 1));
            await context.sync.receiveHostFile(hostFile("<newer />", 2));

            await expect(context.sync.importInitial(initialFile)).resolves.toBe(true);

            expect(surface.loadDiagram).toHaveBeenCalledExactlyOnceWith("<newer />");
            expect(context.sync.documentRevision()).toBe(2);
        });

        it("imports the update that arrived during the initial import", async () => {
            const initialImport = deferred();
            const surface = modelerSurface({
                loadDiagram: vi
                    .fn()
                    .mockImplementationOnce(async () => {
                        await initialImport.promise;
                        return { warnings: [] };
                    })
                    .mockResolvedValue({ warnings: [] }),
            });
            const context = documentSyncOn(surface);
            const importing = context.sync.importInitial(
                await receiveInitial(context, hostFile("<initial />", 1)),
            );
            await vi.advanceTimersByTimeAsync(0);

            await context.sync.receiveHostFile(hostFile("<newer />", 2));
            initialImport.resolve();
            await vi.advanceTimersByTimeAsync(100);

            await expect(importing).resolves.toBe(true);
            expect(surface.loadDiagram.mock.calls).toEqual([["<initial />"], ["<newer />"]]);
            expect(context.sync.documentRevision()).toBe(2);
        });

        it("keeps the initial document when the update queued behind it cannot be opened", async () => {
            const initialImport = deferred();
            const surface = modelerSurface({
                loadDiagram: vi
                    .fn()
                    .mockImplementationOnce(async () => {
                        await initialImport.promise;
                        return { warnings: [] };
                    })
                    .mockRejectedValueOnce(new Error("broken update")),
            });
            const context = documentSyncOn(surface);
            const importing = context.sync.importInitial(
                await receiveInitial(context, hostFile("<initial />", 1)),
            );
            await vi.advanceTimersByTimeAsync(0);

            await context.sync.receiveHostFile(hostFile("<broken />", 2));
            initialImport.resolve();
            await vi.advanceTimersByTimeAsync(100);

            await expect(importing).resolves.toBe(true);
            expect(context.host.ofType("LogErrorCommand")).toEqual([
                expect.objectContaining({ message: "Unable to open host XML\nbroken update" }),
            ]);
        });

        it("falls back to a newer document when the initial one cannot be opened", async () => {
            const initialImport = deferred();
            const surface = modelerSurface({
                loadDiagram: vi.fn(async (xml: string) => {
                    if (xml === "<invalid />") {
                        await initialImport.promise;
                        throw new Error("invalid initial document");
                    }
                    return { warnings: [] };
                }),
            });
            const context = documentSyncOn(surface);
            const importing = context.sync.importInitial(
                await receiveInitial(context, hostFile("<invalid />", 1)),
            );
            await vi.advanceTimersByTimeAsync(0);

            await context.sync.receiveHostFile(hostFile("<valid />", 2));
            initialImport.resolve();

            await expect(importing).resolves.toBe(true);
            expect(surface.loadDiagram).toHaveBeenLastCalledWith("<valid />");
            expect(context.host.ofType("LogErrorCommand")).toEqual([
                expect.objectContaining({
                    message: "Unable to open host XML\ninvalid initial document",
                }),
            ]);
        });

        it("gives up on an initial document that cannot be opened", async () => {
            const surface = modelerSurface({
                loadDiagram: vi.fn().mockRejectedValue(new Error("not BPMN")),
            });
            const context = documentSyncOn(surface);

            const opened = await context.sync.importInitial(
                await receiveInitial(context, hostFile("<broken />", 1)),
            );

            expect(opened).toBe(false);
            expect(context.host.ofType("LogErrorCommand")).toEqual([
                expect.objectContaining({ message: "Unable to open XML\nnot BPMN" }),
            ]);
        });

        it("reloads instead of opening a newest document for another engine", async () => {
            const surface = modelerSurface();
            const context = documentSyncOn(surface);
            const initialFile = await receiveInitial(context, hostFile("<c7 />", 1, "c7"));
            await context.sync.receiveHostFile(hostFile("<c8 />", 2, "c8"));

            await expect(context.sync.importInitial(initialFile)).resolves.toBe(false);

            expect(context.followUps.reloadForEngineChange).toHaveBeenCalledOnce();
            expect(surface.loadDiagram).not.toHaveBeenCalled();
        });

        it("reloads when the update queued behind the initial import switches the engine", async () => {
            const initialImport = deferred();
            const surface = modelerSurface({
                loadDiagram: vi.fn(async () => {
                    await initialImport.promise;
                    return { warnings: [] };
                }),
            });
            const context = documentSyncOn(surface);
            const importing = context.sync.importInitial(
                await receiveInitial(context, hostFile("<c7 />", 1, "c7")),
            );
            await vi.advanceTimersByTimeAsync(0);

            await context.sync.receiveHostFile(hostFile("<c8 />", 2, "c8"));
            initialImport.resolve();

            await expect(importing).resolves.toBe(false);
            expect(context.followUps.reloadForEngineChange).toHaveBeenCalledOnce();
            expect(surface.loadDiagram).toHaveBeenCalledExactlyOnceWith("<c7 />");
        });

        it("starts a blank diagram for empty content on an editable surface", async () => {
            const surface = designerSurface();
            await openedSession(surface, hostFile("", 1, undefined));

            expect(surface.newDiagram).toHaveBeenCalledOnce();
            expect(surface.loadDiagram).not.toHaveBeenCalled();
        });

        it("hands empty content to the readonly viewer unchanged", async () => {
            const surface = viewerSurface();
            await openedSession(surface, hostFile("", 1));

            expect(surface.loadDiagram).toHaveBeenCalledExactlyOnceWith("");
        });

        it("forwards import warnings to the host log", async () => {
            const surface = modelerSurface({
                loadDiagram: vi.fn(async () => ({ warnings: [new Error("unknown attribute")] })),
            });
            const { host } = await openedSession(surface);

            expect(host.ofType("LogWarningCommand")).toEqual([
                expect.objectContaining({ message: expect.stringContaining("unknown attribute") }),
            ]);
        });

        it("restores no view state before the surface is bound", async () => {
            const context = documentSyncOn(modelerSurface());
            await context.sync.importInitial(
                await receiveInitial(context, hostFile("<initial />", 1)),
            );

            expect(context.viewState.captureViewState).not.toHaveBeenCalled();
        });
    });

    describe("host pushes", () => {
        it("hands only the first document to the initial import", async () => {
            const context = documentSyncOn(modelerSurface());
            const first = hostFile("<first />", 1);

            await context.sync.receiveHostFile(first);
            await context.sync.receiveHostFile(hostFile("<second />", 2));

            await expect(context.sync.waitForInitialFile()).resolves.toBe(first);
        });

        it("imports a later push and restores the view captured before it", async () => {
            const surface = modelerSurface();
            const { sync, viewState } = await openedSession(surface);

            await pushUpdate(sync, hostFile("<pushed />", 2));

            expect(surface.loadDiagram).toHaveBeenLastCalledWith("<pushed />");
            expect(viewState.applyViewState).toHaveBeenCalledExactlyOnceWith(viewSnapshot);
            expect(viewState.captureViewState.mock.invocationCallOrder[0]).toBeLessThan(
                surface.loadDiagram.mock.invocationCallOrder[1],
            );
            expect(surface.loadDiagram.mock.invocationCallOrder[1]).toBeLessThan(
                viewState.applyViewState.mock.invocationCallOrder[0],
            );
            expect(sync.documentRevision()).toBe(2);
        });

        it("ignores a push older than the latest revision and keeps the pending edit", async () => {
            const surface = modelerSurface();
            const { sync, host } = await openedSession(surface, hostFile("<initial />", 3));

            sync.scheduleSync();
            await pushUpdate(sync, hostFile("<stale />", 2));
            await vi.advanceTimersByTimeAsync(300);

            expect(surface.loadDiagram).toHaveBeenCalledOnce();
            expect(host.ofType("SyncDocumentCommand")).toEqual([
                expect.objectContaining({ documentRevision: 3 }),
            ]);
        });

        it("drops a pending edit even when the push arrives before host updates are imported", async () => {
            const surface = modelerSurface();
            const context = documentSyncOn(surface);
            await receiveInitial(context, hostFile("<initial />", 1));

            context.sync.scheduleSync();
            await context.sync.receiveHostFile(hostFile("<held />", 2));
            await vi.advanceTimersByTimeAsync(300);

            expect(surface.exportDiagram).not.toHaveBeenCalled();
            expect(surface.loadDiagram).not.toHaveBeenCalled();
        });

        it("drains the pending session actions only once the session is ready", async () => {
            const surface = modelerSurface();
            const context = documentSyncOn(surface);
            await context.sync.importInitial(
                await receiveInitial(context, hostFile("<initial />", 1)),
            );

            await pushUpdate(context.sync, hostFile("<before ready />", 2));
            expect(context.followUps.drainPendingActions).not.toHaveBeenCalled();

            context.sync.markReady();
            await pushUpdate(context.sync, hostFile("<after ready />", 3));

            expect(context.followUps.drainPendingActions).toHaveBeenCalledOnce();
            expect(surface.loadDiagram.mock.invocationCallOrder.at(-1)).toBeLessThan(
                context.followUps.drainPendingActions.mock.invocationCallOrder[0],
            );
        });

        it("drains the pending session actions even when the push cannot be imported", async () => {
            const surface = modelerSurface();
            const { sync, viewState, followUps } = await openedSession(surface);
            surface.loadDiagram.mockRejectedValueOnce(new Error("broken push"));

            const received = sync.receiveHostFile(hostFile("<broken />", 2)).catch((e) => e);
            await vi.advanceTimersByTimeAsync(100);

            await expect(received).resolves.toEqual(new Error("broken push"));
            expect(followUps.drainPendingActions).toHaveBeenCalledOnce();
            expect(viewState.applyViewState).toHaveBeenCalledExactlyOnceWith(viewSnapshot);
        });

        it("keeps the last represented revision when a push cannot be imported", async () => {
            const surface = modelerSurface();
            const { sync, host } = await openedSession(surface);
            surface.loadDiagram.mockRejectedValueOnce(new Error("broken push"));
            const received = sync.receiveHostFile(hostFile("<broken />", 2)).catch(() => undefined);
            await vi.advanceTimersByTimeAsync(100);
            await received;

            sync.scheduleSync();
            await vi.advanceTimersByTimeAsync(300);

            expect(sync.documentRevision()).toBe(1);
            expect(host.ofType("SyncDocumentCommand")).toEqual([
                expect.objectContaining({ documentRevision: 1 }),
            ]);
        });

        it("does not claim the revision of an import a newer push overtook", async () => {
            const overtakenImport = deferred();
            const surface = modelerSurface();
            const { sync } = await openedSession(surface);
            surface.loadDiagram.mockImplementationOnce(async () => {
                await overtakenImport.promise;
                return { warnings: [] };
            });

            const overtaken = sync.receiveHostFile(hostFile("<overtaken />", 2));
            await vi.advanceTimersByTimeAsync(100);
            const newest = sync.receiveHostFile(hostFile("<newest />", 3));
            overtakenImport.resolve();
            await overtaken;

            expect(sync.documentRevision()).toBe(1);

            await vi.advanceTimersByTimeAsync(100);
            await newest;
            expect(sync.documentRevision()).toBe(3);
        });

        it("reloads instead of importing a push for another engine", async () => {
            const surface = modelerSurface();
            const { sync, followUps } = await openedSession(surface);

            await pushUpdate(sync, hostFile("<c8 />", 2, "c8"));

            expect(followUps.reloadForEngineChange).toHaveBeenCalledOnce();
            expect(followUps.drainPendingActions).not.toHaveBeenCalled();
            expect(surface.loadDiagram).not.toHaveBeenCalledWith("<c8 />");
        });

        it("reports a failing queued update and keeps draining the newer one", async () => {
            const brokenImport = deferred();
            const surface = modelerSurface();
            const { sync, host } = await openedSession(surface);
            surface.loadDiagram.mockImplementationOnce(async () => {
                await brokenImport.promise;
                throw new Error("broken push");
            });

            void sync.receiveHostFile(hostFile("<broken />", 2)).catch(() => undefined);
            await vi.advanceTimersByTimeAsync(100);
            void sync.receiveHostFile(hostFile("<newest />", 3));
            const flushed = sync.flushHostUpdates();
            brokenImport.resolve();
            await flushed;

            expect(sync.hasPendingHostUpdate()).toBe(false);
            expect(surface.loadDiagram).toHaveBeenLastCalledWith("<newest />");
            expect(host.ofType("LogErrorCommand")).toEqual([
                expect.objectContaining({ message: "Unable to open host XML\nbroken push" }),
            ]);
        });

        it("runs a queued modeler operation only after the import ahead of it", async () => {
            const pushImport = deferred();
            const surface = modelerSurface();
            const { sync } = await openedSession(surface);
            surface.loadDiagram.mockImplementationOnce(async () => {
                await pushImport.promise;
                return { warnings: [] };
            });
            const operation = vi.fn(async () => undefined);

            void sync.receiveHostFile(hostFile("<pushed />", 2));
            await vi.advanceTimersByTimeAsync(100);
            const queued = sync.enqueueModelerOperation(operation);
            await vi.advanceTimersByTimeAsync(0);
            expect(operation).not.toHaveBeenCalled();

            pushImport.resolve();
            await queued;
            expect(operation).toHaveBeenCalledOnce();
        });
    });

    describe("outbound sync", () => {
        it("syncs an edit before aligning the modeler to the origin", async () => {
            const surface = modelerSurface();
            const { sync, host } = await openedSession(surface);

            sync.scheduleSync();
            await vi.advanceTimersByTimeAsync(300);

            expect(host.ofType("SyncDocumentCommand")).toEqual([
                expect.objectContaining({ content: "<exported />", documentRevision: 1 }),
            ]);
            expect(host.postMessage.mock.invocationCallOrder.at(-1)).toBeLessThan(
                surface.alignElementsToOrigin.mock.invocationCallOrder[0],
            );
        });

        it("syncs a designer edit without aligning", async () => {
            const { sync, host } = await openedSession(designerSurface(), hostFile("<d />", 2));

            sync.scheduleSync();
            await vi.advanceTimersByTimeAsync(300);

            expect(host.ofType("SyncDocumentCommand")).toEqual([
                expect.objectContaining({ content: "<designed />", documentRevision: 2 }),
            ]);
        });

        it("drops an export a host push overtook", async () => {
            const finishExport = deferred<string>();
            const surface = modelerSurface({ exportDiagram: vi.fn(() => finishExport.promise) });
            const { sync, host } = await openedSession(surface);

            sync.scheduleSync();
            await vi.advanceTimersByTimeAsync(300);
            await pushUpdate(sync, hostFile("<pushed />", 2));
            finishExport.resolve("<edit before the push />");
            await vi.advanceTimersByTimeAsync(0);

            expect(host.ofType("SyncDocumentCommand")).toEqual([]);
            expect(surface.alignElementsToOrigin).not.toHaveBeenCalled();
        });

        it("drops an export while a host push waits to import", async () => {
            const surface = modelerSurface();
            const { sync, host } = await openedSession(surface);

            void sync.receiveHostFile(hostFile("<pushed />", 2));
            sync.scheduleSync();
            await sync.flushOutbound();

            expect(surface.exportDiagram).toHaveBeenCalledOnce();
            expect(host.ofType("SyncDocumentCommand")).toEqual([]);
        });

        it("reports an export that fails", async () => {
            const surface = modelerSurface({
                exportDiagram: vi.fn().mockRejectedValue(new Error("export broke")),
            });
            const { sync, host } = await openedSession(surface);

            sync.scheduleSync();
            await vi.advanceTimersByTimeAsync(300);

            expect(host.ofType("LogErrorCommand")).toEqual([
                expect.objectContaining({
                    message: "Failed to sync diagram changes: export broke",
                }),
            ]);
        });

        it("syncs the edit an align pass schedules before a surface is destroyed", async () => {
            const surface = modelerSurface();
            const { sync, host } = await openedSession(surface);
            surface.alignElementsToOrigin.mockImplementationOnce(() => sync.scheduleSync());

            sync.scheduleSync();
            await sync.flushBeforeSurfaceDestroy();

            expect(host.ofType("SyncDocumentCommand")).toHaveLength(2);
            expect(sync.hasPendingSync()).toBe(false);
        });

        it("fires the scheduled sync once on a best-effort flush", async () => {
            const surface = modelerSurface();
            const { sync, host } = await openedSession(surface);
            surface.alignElementsToOrigin.mockImplementationOnce(() => sync.scheduleSync());

            sync.scheduleSync();
            await sync.flushOutbound();

            expect(host.ofType("SyncDocumentCommand")).toHaveLength(1);
            expect(sync.hasPendingSync()).toBe(true);
        });
    });

    describe("flush handshake", () => {
        it("answers a flush before the session is ready as unavailable", async () => {
            const { sync, host } = documentSyncOn(modelerSurface());

            await sync.respondToFlush(new FlushDocumentQuery(1));

            expect(host.ofType("DocumentFlushedCommand")).toEqual([
                expect.objectContaining({ token: 1, status: "unavailable" }),
            ]);
        });

        it("exports a pending edit for a save", async () => {
            const { sync, host } = await openedSession(modelerSurface(), hostFile("<i />", 6));

            sync.scheduleSync();
            await sync.respondToFlush(new FlushDocumentQuery(2));

            expect(host.ofType("DocumentFlushedCommand")).toEqual([
                expect.objectContaining({
                    token: 2,
                    status: "flushed",
                    content: "<exported />",
                    documentRevision: 6,
                }),
            ]);
        });

        it("holds the flush lock from a destructive flush until the host releases it", async () => {
            const { sync, flushLock } = await openedSession(modelerSurface());

            await sync.respondToFlush(new FlushDocumentQuery(3, true));
            expect(flushLock.acquire).toHaveBeenCalledOnce();
            expect(flushLock.release).not.toHaveBeenCalled();

            await sync.respondToFlush(new ReleaseDocumentFlushQuery(3));
            expect(flushLock.release).toHaveBeenCalledOnce();
        });
    });

    describe("cancelAll", () => {
        it("stops every sync and host import for the reload", async () => {
            const surface = modelerSurface();
            const { sync, host, followUps } = await openedSession(surface);

            void sync.receiveHostFile(hostFile("<pending />", 2));
            sync.scheduleSync();
            sync.cancelAll();
            await pushUpdate(sync, hostFile("<after the reload began />", 3));
            await vi.advanceTimersByTimeAsync(300);

            expect(sync.isReady()).toBe(false);
            expect(sync.hasPendingSync()).toBe(false);
            expect(sync.hasPendingHostUpdate()).toBe(false);
            expect(surface.loadDiagram).toHaveBeenCalledOnce();
            expect(surface.exportDiagram).not.toHaveBeenCalled();
            expect(host.ofType("SyncDocumentCommand")).toEqual([]);
            expect(followUps.reloadForEngineChange).not.toHaveBeenCalled();
        });
    });
});
