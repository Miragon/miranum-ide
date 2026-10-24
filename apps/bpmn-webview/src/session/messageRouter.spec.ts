import { describe, expect, it, vi } from "vitest";

import {
    BpmnModelerSettingQuery,
    type Command,
    ElementTemplatesQuery,
    FlushDocumentQuery,
    LanguageQuery,
    type Query,
    ReleaseDocumentFlushQuery,
    TakeFocusQuery,
} from "@miragon/bpmn-modeler-shared";

import {
    admitSessionMessage,
    createHostMessageRouter,
    createSessionMessageRouter,
    type HostMessageHandlers,
    type SessionHostMessages,
} from "./messageRouter";

function createHost() {
    const sent: (Command | Query)[] = [];
    return {
        sent,
        postMessage: vi.fn((message: Command | Query) => {
            sent.push(message);
        }),
        loggedErrors: () =>
            sent
                .filter((message) => message.type === "LogErrorCommand")
                .map((message) => (message as unknown as { message: string }).message),
    };
}

const settingsQuery = () =>
    new BpmnModelerSettingQuery({
        alignToOrigin: false,
        showTransactionBoundaries: false,
        colorTheme: "light",
    });

function sessionRouter(isReloading = () => false) {
    const host = createHost();
    const handlers = {
        LanguageQuery: vi.fn(),
        ElementTemplatesQuery: vi.fn(),
        BpmnModelerSettingQuery: vi.fn(),
        TakeFocusQuery: vi.fn(),
        FlushDocumentQuery: vi.fn(),
        ReleaseDocumentFlushQuery: vi.fn(),
    };
    const router = createSessionMessageRouter(
        host,
        handlers as unknown as HostMessageHandlers<SessionHostMessages>,
        { isReloading },
    );
    return { host, handlers, router };
}

describe("createHostMessageRouter", () => {
    it("hands a message to the handler registered for its type", async () => {
        const languageHandler = vi.fn();
        const takeFocusHandler = vi.fn();
        const route = createHostMessageRouter<{
            LanguageQuery: LanguageQuery;
            TakeFocusQuery: TakeFocusQuery;
        }>(createHost(), { LanguageQuery: languageHandler, TakeFocusQuery: takeFocusHandler });
        const query = new LanguageQuery("de");

        await route(query);

        expect(languageHandler).toHaveBeenCalledExactlyOnceWith(query);
        expect(takeFocusHandler).not.toHaveBeenCalled();
    });

    it.each(["ElementTemplatesQuery", "toString", "constructor"])(
        "ignores a %s it has no handler for",
        async (type) => {
            const host = createHost();
            const route = createHostMessageRouter<{ LanguageQuery: LanguageQuery }>(host, {
                LanguageQuery: vi.fn(),
            });

            await expect(route({ type } as Query)).resolves.toBeUndefined();

            expect(host.sent).toEqual([]);
        },
    );

    it("settles once an async handler has finished", async () => {
        let finishHandler!: () => void;
        const finished = vi.fn();
        const route = createHostMessageRouter<{ LanguageQuery: LanguageQuery }>(createHost(), {
            LanguageQuery: () =>
                new Promise<void>((resolve) => {
                    finishHandler = resolve;
                }),
        });

        const routed = route(new LanguageQuery("de")).then(finished);
        await Promise.resolve();
        expect(finished).not.toHaveBeenCalled();

        finishHandler();
        await routed;
        expect(finished).toHaveBeenCalledOnce();
    });

    it.each([
        [
            "a throwing",
            () => {
                throw new Error("surface gone");
            },
            "surface gone",
        ],
        ["a rejecting", () => Promise.reject(new Error("export failed")), "export failed"],
        [
            "a message-bearing",
            () => Promise.reject({ message: "import warning" }),
            "import warning",
        ],
        ["a bare", () => Promise.reject("plain reason"), "plain reason"],
    ])("logs %s handler failure under the message type", async (_case, handler, detail) => {
        const host = createHost();
        const route = createHostMessageRouter<{ LanguageQuery: LanguageQuery }>(host, {
            LanguageQuery: handler,
        });

        await expect(route(new LanguageQuery("de"))).resolves.toBeUndefined();

        expect(host.loggedErrors()).toEqual([`Error receiving message: LanguageQuery — ${detail}`]);
    });
});

describe("admitSessionMessage", () => {
    it.each([
        ["LanguageQuery", "importBound"],
        ["ElementTemplatesQuery", "importBound"],
        ["UpdateOpenScriptEditorsQuery", "importBound"],
        ["BpmnFileQuery", "route"],
        ["TakeFocusQuery", "route"],
        ["FlushDocumentQuery", "route"],
    ])("admits %s as %s outside an engine reload", (type, admission) => {
        expect(admitSessionMessage(type, { engineReloading: false })).toBe(admission);
    });

    it.each(["FlushDocumentQuery", "ReleaseDocumentFlushQuery"])(
        "still routes %s while the engine reload is pending",
        (type) => {
            expect(admitSessionMessage(type, { engineReloading: true })).toBe("route");
        },
    );

    it.each(["BpmnFileQuery", "LanguageQuery", "GetDiagramAsSVGCommand", "TakeFocusQuery"])(
        "drops %s while the engine reload is pending",
        (type) => {
            expect(admitSessionMessage(type, { engineReloading: true })).toBe("drop");
        },
    );
});

describe("createSessionMessageRouter", () => {
    it("routes a message that does not act on the import right away", async () => {
        const { handlers, router } = sessionRouter();

        await router.route(new TakeFocusQuery());

        expect(handlers.TakeFocusQuery).toHaveBeenCalledOnce();
    });

    it("holds import-bound messages until the import completes, then replays them in order", async () => {
        const { handlers, router } = sessionRouter();
        const delivered: string[] = [];
        handlers.ElementTemplatesQuery.mockImplementation(() => delivered.push("templates"));
        handlers.BpmnModelerSettingQuery.mockImplementation(() => delivered.push("settings"));
        handlers.LanguageQuery.mockImplementation(() => delivered.push("language"));

        await router.route(new ElementTemplatesQuery([]));
        await router.route(settingsQuery());
        expect(delivered).toEqual([]);

        router.openImportBound();
        await router.route(new LanguageQuery("de"));

        expect(delivered).toEqual(["templates", "settings", "language"]);
    });

    it("drops held messages when they are discarded and routes later ones directly", async () => {
        const { handlers, router } = sessionRouter();

        await router.route(new LanguageQuery("de"));
        router.discardImportBound();
        await router.route(new LanguageQuery("fr"));

        expect(handlers.LanguageQuery).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ locale: "fr" }),
        );
    });

    it("answers only the flush handshake while the engine reload is pending", async () => {
        const { handlers, router } = sessionRouter(() => true);
        const flush = new FlushDocumentQuery(7, true);
        const release = new ReleaseDocumentFlushQuery(7);

        await router.route(new TakeFocusQuery());
        await router.route(flush);
        await router.route(release);

        expect(handlers.TakeFocusQuery).not.toHaveBeenCalled();
        expect(handlers.FlushDocumentQuery).toHaveBeenCalledExactlyOnceWith(flush);
        expect(handlers.ReleaseDocumentFlushQuery).toHaveBeenCalledExactlyOnceWith(release);
    });

    it("drops a held message whose replay comes after the engine reload began", async () => {
        let reloading = false;
        const { handlers, router } = sessionRouter(() => reloading);

        await router.route(settingsQuery());
        reloading = true;
        router.openImportBound();

        expect(handlers.BpmnModelerSettingQuery).not.toHaveBeenCalled();
    });

    it("logs a failing handler instead of rejecting", async () => {
        const { host, handlers, router } = sessionRouter();
        handlers.TakeFocusQuery.mockImplementation(() => {
            throw new TypeError("canvas is undefined");
        });

        await expect(router.route(new TakeFocusQuery())).resolves.toBeUndefined();

        expect(host.loggedErrors()).toEqual([
            "Error receiving message: TakeFocusQuery — canvas is undefined",
        ]);
    });
});
