import { afterEach, describe, expect, it, vi } from "vitest";

import {
    type Command,
    FocusElementQuery,
    LanguageQuery,
    type Query,
} from "@miragon/bpmn-modeler-shared";
import { serializeAsync } from "@miragon/bpmn-modeler-types";

import type { SurfaceHandle } from "../surface";
import { createSessionActions } from "./sessionActions";

const translator = vi.hoisted(() => ({ locale: "en" }));

// setLanguage falls back to "en" for a code it does not know, like the real translator.
vi.mock("@miragon/bpmn-modeler-i18n", () => ({
    i18n: {
        getLocale: () => translator.locale,
        setLanguage: (locale: string) => {
            translator.locale = locale === "xx" ? "en" : locale;
        },
    },
}));

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

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((onResolve) => {
        resolve = onResolve;
    });
    return { promise, resolve };
}

function fakeDocumentSync() {
    let ready = false;
    const modelerOperations = serializeAsync(
        async (operation: () => Promise<void>): Promise<void> => operation(),
    );
    return {
        markReady: () => {
            ready = true;
        },
        isReady: vi.fn(() => ready),
        hasPendingHostUpdate: vi.fn(() => false),
        flushHostUpdates: vi.fn(async (): Promise<void> => undefined),
        flushOutbound: vi.fn(async (): Promise<void> => undefined),
        enqueueModelerOperation: vi.fn((operation: () => Promise<void>) =>
            modelerOperations(operation),
        ),
        cancelAll: vi.fn(),
    };
}

const viewSnapshot = {
    rootElementId: "SubProcess_1_plane",
    viewport: { x: 40, y: 20, width: 800, height: 600, scale: 1.5 },
    selectedElementIds: ["Task_1"],
};

function sessionActionsOn() {
    const host = createHost();
    const surface = {
        exportDiagram: vi.fn(async () => "<exported />"),
        loadDiagram: vi.fn(async () => ({ warnings: [] })),
        destroy: vi.fn(),
        viewport: { centerOnElement: vi.fn() },
    };
    const viewState = {
        captureViewState: vi.fn(() => viewSnapshot),
        applyViewState: vi.fn(),
        flushViewport: vi.fn(),
    };
    let boundViewState: typeof viewState | undefined = viewState;
    const documentSync = fakeDocumentSync();
    const reloadLock = { acquire: vi.fn(), release: vi.fn() };
    const cancelPendingVariablePublish = vi.fn();
    const reloadPage = vi.fn();
    const actions = createSessionActions(host, () => surface as unknown as SurfaceHandle, {
        documentSync,
        getViewState: () => boundViewState,
        reloadLock,
        cancelPendingVariablePublish,
        reloadPage,
    });
    const unbindViewState = () => {
        boundViewState = undefined;
    };
    return {
        host,
        surface,
        viewState,
        unbindViewState,
        documentSync,
        reloadLock,
        cancelPendingVariablePublish,
        reloadPage,
        actions,
        ...actions.handlers,
    };
}

const callOrder = (fn: { mock: { invocationCallOrder: number[] } }, call = 0) =>
    fn.mock.invocationCallOrder[call];

describe("createSessionActions", () => {
    afterEach(() => {
        translator.locale = "en";
    });

    describe("language changes", () => {
        it("re-imports the diagram with its view state once the locale changes", async () => {
            const context = sessionActionsOn();
            context.documentSync.markReady();

            await context.LanguageQuery(new LanguageQuery("de"));

            expect(translator.locale).toBe("de");
            expect(context.surface.loadDiagram).toHaveBeenCalledExactlyOnceWith("<exported />");
            expect(context.viewState.applyViewState).toHaveBeenCalledExactlyOnceWith(viewSnapshot);
            expect(callOrder(context.surface.exportDiagram)).toBeLessThan(
                callOrder(context.viewState.captureViewState),
            );
            expect(callOrder(context.surface.loadDiagram)).toBeLessThan(
                callOrder(context.viewState.applyViewState),
            );
        });

        it.each([
            ["the same locale", "en"],
            ["an unknown locale that resolves to the current one", "xx"],
        ])("does not re-import for %s", async (_case, locale) => {
            const context = sessionActionsOn();
            context.documentSync.markReady();

            await context.LanguageQuery(new LanguageQuery(locale));

            expect(context.surface.exportDiagram).not.toHaveBeenCalled();
        });

        it("holds the re-import until the session is ready", async () => {
            const context = sessionActionsOn();

            await context.LanguageQuery(new LanguageQuery("de"));
            expect(context.surface.exportDiagram).not.toHaveBeenCalled();

            context.documentSync.markReady();
            await context.actions.drainPendingActions();
            expect(context.surface.loadDiagram).toHaveBeenCalledOnce();
        });

        it("restores the view state and reports a re-import that fails", async () => {
            const context = sessionActionsOn();
            context.surface.loadDiagram.mockRejectedValueOnce(new Error("broken refresh"));
            context.documentSync.markReady();

            await context.LanguageQuery(new LanguageQuery("de"));

            expect(context.viewState.applyViewState).toHaveBeenCalledExactlyOnceWith(viewSnapshot);
            expect(context.host.ofType("LogErrorCommand")).toEqual([
                expect.objectContaining({ message: "Unable to refresh diagram\nbroken refresh" }),
            ]);
        });

        it("re-imports inside the modeler operation queue", async () => {
            const context = sessionActionsOn();
            const queuedImport = deferred();
            void context.documentSync.enqueueModelerOperation(() => queuedImport.promise);
            context.documentSync.markReady();

            const changing = context.LanguageQuery(new LanguageQuery("de"));
            await Promise.resolve();
            expect(context.surface.exportDiagram).not.toHaveBeenCalled();

            queuedImport.resolve();
            await changing;
            expect(context.surface.exportDiagram).toHaveBeenCalledOnce();
        });
    });

    describe("element focus", () => {
        it("centres the element right away once the session is ready", async () => {
            const context = sessionActionsOn();
            context.documentSync.markReady();

            await context.FocusElementQuery(new FocusElementQuery("Task_1"));

            expect(context.surface.viewport.centerOnElement).toHaveBeenCalledExactlyOnceWith(
                "Task_1",
            );
        });

        it("centres only the last element asked for before the session was ready", async () => {
            const context = sessionActionsOn();

            await context.FocusElementQuery(new FocusElementQuery("Task_1"));
            await context.FocusElementQuery(new FocusElementQuery("Task_2"));
            expect(context.surface.viewport.centerOnElement).not.toHaveBeenCalled();

            context.documentSync.markReady();
            await context.actions.drainPendingActions();
            expect(context.surface.viewport.centerOnElement).toHaveBeenCalledExactlyOnceWith(
                "Task_2",
            );
        });
    });

    describe("drain", () => {
        it("imports the host updates, then re-imports, then centres the element", async () => {
            const context = sessionActionsOn();
            await context.LanguageQuery(new LanguageQuery("de"));
            await context.FocusElementQuery(new FocusElementQuery("Task_1"));

            await context.actions.drainPendingActions();

            const { flushHostUpdates } = context.documentSync;
            expect(flushHostUpdates).toHaveBeenCalledTimes(2);
            expect(callOrder(flushHostUpdates)).toBeLessThan(
                callOrder(context.surface.exportDiagram),
            );
            expect(callOrder(context.surface.loadDiagram)).toBeLessThan(
                callOrder(flushHostUpdates, 1),
            );
            expect(callOrder(flushHostUpdates, 1)).toBeLessThan(
                callOrder(context.surface.viewport.centerOnElement),
            );
        });

        it("waits for a host update that is still pending before it centres the element", async () => {
            const context = sessionActionsOn();
            context.documentSync.hasPendingHostUpdate
                .mockReturnValueOnce(true)
                .mockReturnValue(false);
            await context.FocusElementQuery(new FocusElementQuery("Task_1"));

            await context.actions.drainPendingActions();

            expect(context.documentSync.flushHostUpdates).toHaveBeenCalledTimes(2);
            expect(callOrder(context.documentSync.flushHostUpdates, 1)).toBeLessThan(
                callOrder(context.surface.viewport.centerOnElement),
            );
        });

        it("shares one drain between callers that overlap", async () => {
            const context = sessionActionsOn();
            const hostUpdates = deferred();
            context.documentSync.flushHostUpdates.mockImplementationOnce(() => hostUpdates.promise);
            await context.LanguageQuery(new LanguageQuery("de"));

            const first = context.actions.drainPendingActions();
            const second = context.actions.drainPendingActions();
            hostUpdates.resolve();
            await Promise.all([first, second]);

            expect(second).toBe(first);
            expect(context.surface.loadDiagram).toHaveBeenCalledOnce();
        });

        it("starts a fresh drain once the previous one has finished", async () => {
            const context = sessionActionsOn();

            await context.actions.drainPendingActions();
            await context.FocusElementQuery(new FocusElementQuery("Task_1"));
            await context.actions.drainPendingActions();

            expect(context.surface.viewport.centerOnElement).toHaveBeenCalledOnce();
        });
    });

    describe("engine reload", () => {
        it("stops the document sync and locks the page before the queued teardown", async () => {
            const context = sessionActionsOn();
            const queuedImport = deferred();
            void context.documentSync.enqueueModelerOperation(() => queuedImport.promise);

            const reloading = context.actions.reloadForEngineChange();

            expect(context.actions.isReloading()).toBe(true);
            expect(context.documentSync.cancelAll).toHaveBeenCalledOnce();
            expect(context.cancelPendingVariablePublish).toHaveBeenCalledOnce();
            expect(context.reloadLock.acquire).toHaveBeenCalledOnce();
            await Promise.resolve();
            expect(context.surface.destroy).not.toHaveBeenCalled();

            queuedImport.resolve();
            await reloading;

            expect(context.documentSync.cancelAll).toHaveBeenCalledTimes(2);
            expect(callOrder(context.documentSync.cancelAll, 1)).toBeLessThan(
                callOrder(context.documentSync.flushOutbound),
            );
            expect(callOrder(context.documentSync.flushOutbound)).toBeLessThan(
                callOrder(context.viewState.flushViewport),
            );
            expect(callOrder(context.viewState.flushViewport)).toBeLessThan(
                callOrder(context.surface.destroy),
            );
            expect(callOrder(context.surface.destroy)).toBeLessThan(callOrder(context.reloadPage));
            expect(context.reloadLock.release).not.toHaveBeenCalled();
        });

        it("tears the page down only once", async () => {
            const context = sessionActionsOn();

            await Promise.all([
                context.actions.reloadForEngineChange(),
                context.actions.reloadForEngineChange(),
            ]);

            expect(context.surface.destroy).toHaveBeenCalledOnce();
            expect(context.reloadPage).toHaveBeenCalledOnce();
        });

        it("destroys the surface and reloads even when the last sync fails", async () => {
            const context = sessionActionsOn();
            context.documentSync.flushOutbound.mockRejectedValueOnce(new Error("sync broke"));

            await expect(context.actions.reloadForEngineChange()).rejects.toThrow("sync broke");

            expect(context.surface.destroy).toHaveBeenCalledOnce();
            expect(context.reloadPage).toHaveBeenCalledOnce();
        });

        it("reloads even when the surface cannot be destroyed", async () => {
            const context = sessionActionsOn();
            context.surface.destroy.mockImplementationOnce(() => {
                throw new Error("already gone");
            });

            await expect(context.actions.reloadForEngineChange()).rejects.toThrow("already gone");

            expect(context.reloadPage).toHaveBeenCalledOnce();
        });

        it("reloads before the surface is bound", async () => {
            const context = sessionActionsOn();
            context.unbindViewState();

            await context.actions.reloadForEngineChange();

            expect(context.reloadPage).toHaveBeenCalledOnce();
        });

        it("drops the re-import and focus the host asked for", async () => {
            const context = sessionActionsOn();
            await context.LanguageQuery(new LanguageQuery("de"));
            await context.FocusElementQuery(new FocusElementQuery("Task_1"));

            await context.actions.reloadForEngineChange();
            context.documentSync.markReady();
            await context.actions.drainPendingActions();
            await context.FocusElementQuery(new FocusElementQuery("Task_2"));

            expect(context.documentSync.flushHostUpdates).not.toHaveBeenCalled();
            expect(context.surface.exportDiagram).not.toHaveBeenCalled();
            expect(context.surface.viewport.centerOnElement).not.toHaveBeenCalled();
        });

        it("stops a drain when the reload lands while host updates import", async () => {
            const context = sessionActionsOn();
            context.documentSync.flushHostUpdates.mockImplementationOnce(() =>
                context.actions.reloadForEngineChange(),
            );
            await context.LanguageQuery(new LanguageQuery("de"));
            await context.FocusElementQuery(new FocusElementQuery("Task_1"));

            await context.actions.drainPendingActions();

            expect(context.surface.exportDiagram).not.toHaveBeenCalled();
            expect(context.surface.viewport.centerOnElement).not.toHaveBeenCalled();
        });

        it("stops a drain when the reload lands during the re-import", async () => {
            const context = sessionActionsOn();
            context.surface.loadDiagram.mockImplementationOnce(async () => {
                void context.actions.reloadForEngineChange();
                return { warnings: [] };
            });
            await context.LanguageQuery(new LanguageQuery("de"));
            await context.FocusElementQuery(new FocusElementQuery("Task_1"));

            await context.actions.drainPendingActions();

            expect(context.documentSync.flushHostUpdates).toHaveBeenCalledOnce();
            expect(context.surface.viewport.centerOnElement).not.toHaveBeenCalled();
        });
    });
});
