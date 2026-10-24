import { afterEach, describe, expect, it, vi } from "vitest";

import type { SurfaceFactories } from "@miragon/bpmn-modeler/mode";
import { type Command, createInertLockGroup, type Query } from "@miragon/bpmn-modeler-shared";
import {
    type DetectedEngine,
    NoModelerError,
    serializeAsync,
    type SurfaceMode,
    UnsupportedEngineError,
} from "@miragon/bpmn-modeler-types";

import type { SurfaceHandle } from "../surface";
import { createModeController } from "./modeController";

type Posted = { type: string; message?: string; stack?: string };

function createHost() {
    const sent: Posted[] = [];
    return {
        sent,
        postMessage: vi.fn((message: Command | Query) => {
            sent.push(message as unknown as Posted);
        }),
    };
}

function fakeCanvas() {
    return { focus: vi.fn() };
}

function fakeViewer(overrides: Record<string, unknown> = {}) {
    const canvas = fakeCanvas();
    return {
        canvas,
        loadDiagram: vi.fn(async () => ({ warnings: [] })),
        exportDiagram: vi.fn(async () => "<exported />"),
        captureViewState: vi.fn(() => ({ rootElementId: "Process_1" })),
        applyViewState: vi.fn(),
        setTheme: vi.fn(),
        destroy: vi.fn(),
        getService: vi.fn(() => canvas),
        ...overrides,
    };
}

function fakeModeler(initialMode: "design" | "implement", overrides: Record<string, unknown> = {}) {
    let mode = initialMode;
    const modeler = {
        ...fakeViewer(),
        newDiagram: vi.fn(),
        setMode: vi.fn((next: "design" | "implement") => {
            mode = next;
        }),
        getMode: () => mode,
    };
    return Object.assign(modeler, overrides);
}

function fakeViewState() {
    return {
        persistMode: vi.fn(),
        restoreViewport: vi.fn(),
        restorePanelUiState: vi.fn(),
        startPersisting: vi.fn(),
    };
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
        isReady: () => ready,
        flushBeforeSurfaceDestroy: vi.fn(async (): Promise<void> => undefined),
        enqueueModelerOperation: vi.fn((operation: () => Promise<void>) =>
            modelerOperations(operation),
        ),
    };
}

function fakeBinder() {
    const bindings: {
        handle: unknown;
        stateManager: ReturnType<typeof fakeViewState>;
        dispose: ReturnType<typeof vi.fn>;
    }[] = [];
    return {
        bindings,
        bindSurface: vi.fn((handle: SurfaceHandle) => {
            const binding = { handle, stateManager: fakeViewState(), dispose: vi.fn() };
            bindings.push(binding);
            return binding as never;
        }),
        requestSurfaceResources: vi.fn(),
    };
}

function controllerWith({
    engine = "c7",
    initialMode = "implement",
    surfaces = {},
}: {
    engine?: DetectedEngine;
    initialMode?: SurfaceMode;
    surfaces?: Partial<SurfaceFactories>;
} = {}) {
    const host = createHost();
    const documentSync = fakeDocumentSync();
    let reloading = false;
    const page = document.createElement("div");
    const hostModelerState = { restoreOpenScripts: vi.fn() };
    const binder = fakeBinder();
    const stripHost = document.createElement("div");
    const stripEl = document.createElement("div");
    const modeler = fakeModeler(initialMode === "design" ? "design" : "implement");
    const viewer = fakeViewer();
    const factories = {
        view: vi.fn(async () => viewer),
        implement: vi.fn(async () => modeler),
        ...surfaces,
    } as unknown as SurfaceFactories;
    const modes = createModeController(host, {
        documentSync,
        lifecycle: { isReloading: () => reloading },
        switchLock: createInertLockGroup(page).createLock(),
        hostModelerState,
    });
    const start = () =>
        modes.start({
            container: document.createElement("div"),
            engine,
            surfaces: factories,
            initialMode,
            theme: "light",
            binder,
            strip: { host: stripHost, stripEl },
        });
    const boot = async () => {
        await start();
        documentSync.markReady();
        const viewState = modes.bindInitialSurface();
        modes.markInitialSurfaceReady();
        return viewState as unknown as ReturnType<typeof fakeViewState>;
    };
    const modeItem = (mode: SurfaceMode) =>
        stripEl.querySelector<HTMLButtonElement>(`.mode-menu-item[data-mode="${mode}"]`)!;
    return {
        host,
        documentSync,
        page,
        hostModelerState,
        binder,
        stripHost,
        stripEl,
        modeler,
        viewer,
        factories,
        modes,
        start,
        boot,
        clickMode: (mode: SurfaceMode) => modeItem(mode).click(),
        beginReload: () => {
            reloading = true;
        },
    };
}

async function settle(): Promise<void> {
    for (let index = 0; index < 10; index++) {
        await Promise.resolve();
    }
}

const callOrder = (fn: { mock: { invocationCallOrder: number[] } }) =>
    fn.mock.invocationCallOrder[0];

describe("createModeController", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("start", () => {
        it("builds the initial surface but leaves its binding to the initial import", async () => {
            const { binder, stripHost, modeler, modes, start } = controllerWith();

            await expect(start()).resolves.toBe(true);

            expect(modes.getSurface()).toBe(modeler);
            expect(binder.bindSurface).not.toHaveBeenCalled();
            expect(modes.getViewState()).toBeUndefined();
            expect(binder.requestSurfaceResources).toHaveBeenCalledExactlyOnceWith(modeler);
            expect(stripHost.getAttribute("data-surface-mode")).toBe("implement");
            expect(stripHost.getAttribute("aria-busy")).toBe("true");
        });

        it.each([
            ["no modeler", new NoModelerError(), "Modeler is not initialized!"],
            ["an unknown engine", new UnsupportedEngineError("c9"), "Unsupported engine: c9"],
        ])("reports %s as its own message", async (_label, error, message) => {
            const { host, stripEl, start } = controllerWith({
                surfaces: { implement: vi.fn(async () => Promise.reject(error)) },
            });

            await expect(start()).resolves.toBe(false);

            expect(host.sent).toEqual([{ type: "LogErrorCommand", message, stack: undefined }]);
            expect(stripEl.childElementCount).toBe(0);
        });

        it("reports any other creation failure with its cause", async () => {
            const cause = new Error("chunk failed to load");
            const { host, start } = controllerWith({
                surfaces: { implement: vi.fn(async () => Promise.reject(cause)) },
            });

            await expect(start()).resolves.toBe(false);

            expect(host.sent).toEqual([
                expect.objectContaining({
                    type: "LogErrorCommand",
                    message: "Unable to create modeler surface\nchunk failed to load",
                    stack: cause.stack,
                }),
            ]);
        });
    });

    describe("binding", () => {
        it("binds the initial surface on request and marks the resolved mode as landed", async () => {
            const { binder, stripHost, modeler, modes, boot } = controllerWith();

            const viewState = await boot();

            expect(binder.bindSurface).toHaveBeenCalledExactlyOnceWith(modeler);
            expect(modes.getViewState()).toBe(viewState);
            expect(viewState.persistMode).toHaveBeenCalledExactlyOnceWith("implement");
            expect(stripHost.getAttribute("aria-busy")).toBe("false");
        });

        it("disposes the live binding on request", async () => {
            const { binder, modes, boot } = controllerWith();
            modes.disposeSurfaceBinding();

            await boot();
            modes.disposeSurfaceBinding();

            expect(binder.bindings[0].dispose).toHaveBeenCalledOnce();
        });
    });

    describe("mode strip", () => {
        it("drops mode clicks until the initial surface is ready", async () => {
            const { documentSync, factories, modes, start, clickMode } = controllerWith();
            await start();
            documentSync.markReady();
            modes.bindInitialSurface();

            clickMode("view");
            await settle();
            expect(factories.view).not.toHaveBeenCalled();

            modes.markInitialSurfaceReady();
            clickMode("view");
            await settle();
            expect(factories.view).toHaveBeenCalledOnce();
        });

        it("drops a mode click while a switch is in flight", async () => {
            let releaseExport!: () => void;
            const modeler = fakeModeler("implement", {
                exportDiagram: vi.fn(
                    () =>
                        new Promise<string>((resolve) => {
                            releaseExport = () => resolve("<exported />");
                        }),
                ),
            });
            const { factories, boot, clickMode } = controllerWith({
                surfaces: { implement: vi.fn(async () => modeler) as never },
            });
            await boot();

            clickMode("view");
            await settle();
            clickMode("design");
            releaseExport();
            await settle();

            expect(modeler.setMode).not.toHaveBeenCalled();
            expect(modeler.destroy).toHaveBeenCalledOnce();
            expect(factories.view).toHaveBeenCalledOnce();
        });

        it("drops a mode click once an engine reload began", async () => {
            const { documentSync, modeler, boot, clickMode, beginReload } = controllerWith();
            await boot();

            beginReload();
            clickMode("design");
            await settle();

            expect(documentSync.enqueueModelerOperation).not.toHaveBeenCalled();
            expect(modeler.setMode).not.toHaveBeenCalled();
        });

        it("queues a switch behind the modeler operation in flight", async () => {
            const { documentSync, factories, boot, clickMode } = controllerWith();
            await boot();
            let releaseImport!: () => void;
            void documentSync.enqueueModelerOperation(
                () =>
                    new Promise<void>((resolve) => {
                        releaseImport = resolve;
                    }),
            );

            clickMode("view");
            await settle();
            expect(factories.view).not.toHaveBeenCalled();

            releaseImport();
            await settle();
            expect(factories.view).toHaveBeenCalledOnce();
        });

        it("focuses the live canvas when Escape leaves the closed strip", async () => {
            const { stripEl, modeler, boot } = controllerWith();
            await boot();

            stripEl
                .querySelector(".mode-chip")!
                .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

            expect(modeler.canvas.focus).toHaveBeenCalledOnce();
        });
    });

    describe("switching", () => {
        it("toggles Design↔Implement live and persists the new mode", async () => {
            const { binder, stripHost, modeler, factories, boot, clickMode } = controllerWith();
            const viewState = await boot();

            clickMode("design");
            await settle();

            expect(modeler.setMode).toHaveBeenCalledExactlyOnceWith("design");
            expect(modeler.destroy).not.toHaveBeenCalled();
            expect(factories.implement).toHaveBeenCalledOnce();
            expect(binder.bindSurface).toHaveBeenCalledOnce();
            expect(viewState.persistMode).toHaveBeenLastCalledWith("design");
            expect(viewState.restorePanelUiState).not.toHaveBeenCalled();
            expect(stripHost.getAttribute("data-surface-mode")).toBe("design");
        });

        it("binds a recreated surface before its import and resumes its panel UI and persistence", async () => {
            const {
                documentSync,
                binder,
                hostModelerState,
                modeler,
                viewer,
                modes,
                boot,
                clickMode,
            } = controllerWith();
            await boot();

            clickMode("view");
            await settle();

            const [initial, recreated] = binder.bindings;
            expect(callOrder(documentSync.flushBeforeSurfaceDestroy)).toBeLessThan(
                callOrder(modeler.destroy),
            );
            expect(callOrder(initial.dispose)).toBeLessThan(callOrder(modeler.destroy));
            expect(recreated.handle).toBe(viewer);
            expect(binder.bindSurface.mock.invocationCallOrder[1]).toBeLessThan(
                callOrder(viewer.loadDiagram),
            );
            expect(viewer.applyViewState).toHaveBeenCalledOnce();
            expect(recreated.stateManager.persistMode).toHaveBeenCalledExactlyOnceWith("view");
            expect(recreated.stateManager.restoreViewport).not.toHaveBeenCalled();
            expect(recreated.stateManager.restorePanelUiState).toHaveBeenCalledOnce();
            expect(recreated.stateManager.startPersisting).toHaveBeenCalledOnce();
            expect(binder.requestSurfaceResources).toHaveBeenLastCalledWith(viewer);
            expect(hostModelerState.restoreOpenScripts).not.toHaveBeenCalled();
            expect(modes.getSurface()).toBe(viewer);
            expect(modes.getViewState()).toBe(recreated.stateManager);
        });

        it("re-applies the host's script locks to a modeler a switch rebuilds, after its import", async () => {
            const { hostModelerState, modeler, boot, clickMode } = controllerWith({
                initialMode: "view",
            });
            await boot();

            clickMode("implement");
            await settle();

            expect(hostModelerState.restoreOpenScripts).toHaveBeenCalledExactlyOnceWith(modeler);
            expect(callOrder(modeler.loadDiagram)).toBeLessThan(
                callOrder(hostModelerState.restoreOpenScripts),
            );
        });

        it("restores the persisted viewport on the fallback a failed switch stands up", async () => {
            const fallback = fakeModeler("implement");
            const first = fakeModeler("implement");
            const { host, binder, boot, clickMode } = controllerWith({
                surfaces: {
                    view: vi.fn(async () => Promise.reject(new Error("viewer failed"))),
                    implement: vi
                        .fn()
                        .mockResolvedValueOnce(first)
                        .mockResolvedValueOnce(fallback) as never,
                },
            });
            await boot();

            clickMode("view");
            await settle();

            const fallbackBinding = binder.bindings.at(-1)!;
            expect(fallbackBinding.handle).toBe(fallback);
            expect(fallbackBinding.stateManager.restoreViewport).toHaveBeenCalledOnce();
            expect(callOrder(fallback.loadDiagram)).toBeLessThan(
                callOrder(fallbackBinding.stateManager.restoreViewport),
            );
            expect(host.sent).toEqual([
                expect.objectContaining({
                    type: "LogErrorCommand",
                    message: "Unable to switch mode\nviewer failed",
                }),
            ]);
        });

        it.each([false, true])(
            "holds the page inert during a switch and restores its own state (%s) after",
            async (inertBeforeSwitch) => {
                let finishViewer!: () => void;
                const viewer = fakeViewer();
                const { page, stripHost, boot, clickMode } = controllerWith({
                    surfaces: {
                        view: vi.fn(
                            () =>
                                new Promise((resolve) => {
                                    finishViewer = () => resolve(viewer);
                                }),
                        ) as never,
                    },
                });
                await boot();
                page.inert = inertBeforeSwitch;

                clickMode("view");
                await settle();
                expect(page.inert).toBe(true);
                expect(stripHost.getAttribute("aria-busy")).toBe("true");

                finishViewer();
                await settle();

                expect(page.inert).toBe(inertBeforeSwitch);
                expect(stripHost.getAttribute("aria-busy")).toBe("false");
            },
        );

        it("builds the next surface in the theme the host switched to", async () => {
            const { modeler, factories, modes, boot, clickMode } = controllerWith();
            modes.setTheme("dark");
            await boot();

            modes.setTheme("dark");
            clickMode("view");
            await settle();

            expect(modeler.setTheme).toHaveBeenCalledExactlyOnceWith("dark");
            expect(factories.view).toHaveBeenCalledWith(expect.objectContaining({ theme: "dark" }));
        });

        it("follows a mode toggle the modeler reports itself", async () => {
            const { stripHost, modes, boot } = controllerWith();
            modes.followModelerToggle("design");
            const viewState = await boot();

            modes.followModelerToggle("design");

            expect(viewState.persistMode).toHaveBeenLastCalledWith("design");
            expect(stripHost.getAttribute("data-surface-mode")).toBe("design");
        });
    });
});
