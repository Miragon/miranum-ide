import { describe, expect, it, vi } from "vitest";

import {
    Command,
    SyncDocumentCommand,
    UpdateFormOutputValuesCommand,
} from "@miragon/bpmn-modeler-shared";

import {
    getFormFileHandler,
    getFormInputValuesHandler,
    syncFormDocumentHandler,
    updateFormOutputValuesHandler,
} from "./formMessageHandlers";

const EDITOR_ID = "file:///work/order.form";
const ANY_COMMAND = { type: "Ignored" } as Command;

describe("getFormFileHandler", () => {
    it("logs readiness only when the form actually rendered", async () => {
        const formService = {
            display: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
        };
        const notifier = { logDebug: vi.fn() };
        const handle = getFormFileHandler(formService as never, notifier as never);

        await handle(ANY_COMMAND, EDITOR_ID);
        await handle(ANY_COMMAND, EDITOR_ID);

        expect(formService.display).toHaveBeenCalledWith(EDITOR_ID);
        expect(notifier.logDebug).toHaveBeenCalledOnce();
    });
});

describe("syncFormDocumentHandler", () => {
    it("writes the webview's content with the revision it was based on", async () => {
        const formService = { sync: vi.fn().mockResolvedValue(true) };

        await syncFormDocumentHandler(formService as never)(
            new SyncDocumentCommand('{"components":[]}', 7),
            EDITOR_ID,
        );

        expect(formService.sync).toHaveBeenCalledWith(EDITOR_ID, '{"components":[]}', 7);
    });
});

describe("getFormInputValuesHandler", () => {
    it("propagates a failed send so the router logs it", async () => {
        const failure = new Error("webview gone");
        const formValues = { sendInputValues: vi.fn().mockRejectedValue(failure) };

        await expect(
            getFormInputValuesHandler(formValues as never)(ANY_COMMAND, EDITOR_ID),
        ).rejects.toBe(failure);
        expect(formValues.sendInputValues).toHaveBeenCalledWith(EDITOR_ID);
    });
});

describe("updateFormOutputValuesHandler", () => {
    it("hands the submitted output values to the values controller", () => {
        const formValues = { updateOutputValues: vi.fn() };

        updateFormOutputValuesHandler(formValues as never)(
            new UpdateFormOutputValuesCommand('{"approved":true}'),
            EDITOR_ID,
        );

        expect(formValues.updateOutputValues).toHaveBeenCalledWith(EDITOR_ID, '{"approved":true}');
    });
});
