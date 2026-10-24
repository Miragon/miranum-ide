import { beforeEach, describe, expect, it, vi } from "vitest";

import { Command, SyncDocumentCommand } from "@miragon/bpmn-modeler-shared";
import { RecordingNotifier } from "@miragon/bpmn-modeler-core/testing";

import {
    getDmnFileHandler,
    getDmnModelerSettingHandler,
    syncDmnDocumentHandler,
} from "./dmnMessageHandlers";

const EDITOR = "file:///work/decision.dmn";
// A command the read-style handler ignores; a typed placeholder keeps signatures honest.
const ANY: Command = { type: "Ignored" } as Command;

beforeEach(() => {
    vi.clearAllMocks();
});

describe("getDmnFileHandler", () => {
    it("logs readiness only when the diagram actually rendered", async () => {
        const dmnService = { display: vi.fn().mockResolvedValue(true) };
        const notifier = new RecordingNotifier();

        await getDmnFileHandler(dmnService as never, notifier)(ANY, EDITOR);

        expect(dmnService.display).toHaveBeenCalledWith(EDITOR);
        expect(notifier.logged("debug")).toEqual(["Dmn modeler is ready"]);
    });

    it("does not log when rendering was skipped", async () => {
        const dmnService = { display: vi.fn().mockResolvedValue(false) };
        const notifier = new RecordingNotifier();

        await getDmnFileHandler(dmnService as never, notifier)(ANY, EDITOR);

        expect(notifier.logs).toEqual([]);
    });
});

describe("getDmnModelerSettingHandler", () => {
    it("asks the broadcaster to push settings and language for the editor", async () => {
        const settingsBroadcaster = {
            setSettings: vi.fn().mockResolvedValue(true),
            setLanguage: vi.fn(),
        };

        await getDmnModelerSettingHandler(settingsBroadcaster as never)(ANY, EDITOR);

        expect(settingsBroadcaster.setSettings).toHaveBeenCalledWith(EDITOR);
        expect(settingsBroadcaster.setLanguage).toHaveBeenCalledWith(EDITOR);
    });

    it("rejects when setSettings rejects so the router's dispatch catch logs it", async () => {
        const boom = new Error("settings failed");
        const settingsBroadcaster = {
            setSettings: vi.fn().mockRejectedValue(boom),
            setLanguage: vi.fn(),
        };

        await expect(
            getDmnModelerSettingHandler(settingsBroadcaster as never)(ANY, EDITOR),
        ).rejects.toThrow(boom);
    });
});

describe("syncDmnDocumentHandler", () => {
    it("forwards the editor id and command content to sync", async () => {
        const dmnService = { sync: vi.fn().mockResolvedValue(undefined) };

        await syncDmnDocumentHandler(dmnService as never)(
            new SyncDocumentCommand("<dmn/>"),
            EDITOR,
        );

        expect(dmnService.sync).toHaveBeenCalledWith(EDITOR, "<dmn/>", 0);
    });
});
