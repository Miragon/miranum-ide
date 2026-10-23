import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClipboardQuery, TextClipboardQuery } from "@miragon/bpmn-modeler-shared";

import { BpmnClipboardMediator } from "./BpmnClipboardMediator";

const EDITOR = "file:///work/diagram.bpmn";

function createMediator() {
    const editorStore = { postMessage: vi.fn().mockResolvedValue(true) };
    const clipboard = {
        readClipboard: vi.fn().mockResolvedValue(""),
        writeClipboard: vi.fn().mockResolvedValue(undefined),
    };
    const notifier = { logError: vi.fn() };

    const mediator = new BpmnClipboardMediator(
        editorStore as never,
        clipboard as never,
        notifier as never,
    );

    return { mediator, editorStore, clipboard, notifier };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("BpmnClipboardMediator.readClipboard", () => {
    it("posts the host clipboard text as a ClipboardQuery", async () => {
        const { mediator, editorStore, clipboard } = createMediator();
        clipboard.readClipboard.mockResolvedValue("<bpmn-copy/>");

        await mediator.readClipboard(EDITOR);

        const [id, msg] = editorStore.postMessage.mock.calls[0];
        expect(id).toBe(EDITOR);
        expect(msg).toBeInstanceOf(ClipboardQuery);
        expect((msg as ClipboardQuery).text).toBe("<bpmn-copy/>");
    });

    it("answers with empty text when reading the clipboard throws", async () => {
        const { mediator, clipboard, notifier, editorStore } = createMediator();
        clipboard.readClipboard.mockRejectedValue(new Error("denied"));

        await mediator.readClipboard(EDITOR);

        expect(notifier.logError).toHaveBeenCalledOnce();
        expect(editorStore.postMessage).toHaveBeenCalledOnce();
        const [id, msg] = editorStore.postMessage.mock.calls[0];
        expect(id).toBe(EDITOR);
        expect(msg).toBeInstanceOf(ClipboardQuery);
        expect((msg as ClipboardQuery).text).toBe("");
    });

    it("logs, without throwing, an empty reply that cannot be posted", async () => {
        const { mediator, clipboard, notifier, editorStore } = createMediator();
        clipboard.readClipboard.mockRejectedValue(new Error("denied"));
        editorStore.postMessage.mockRejectedValue(new Error("webview gone"));

        await expect(mediator.readClipboard(EDITOR)).resolves.toBeUndefined();
        expect(notifier.logError).toHaveBeenCalledTimes(2);
        expect(notifier.logError).toHaveBeenLastCalledWith(new Error("webview gone"));
    });
});

describe("BpmnClipboardMediator.readTextClipboard", () => {
    it("posts the host clipboard text as a TextClipboardQuery", async () => {
        const { mediator, editorStore, clipboard } = createMediator();
        clipboard.readClipboard.mockResolvedValue("plain text");

        await mediator.readTextClipboard(EDITOR);

        const msg = editorStore.postMessage.mock.calls[0][1];
        expect(msg).toBeInstanceOf(TextClipboardQuery);
        expect((msg as TextClipboardQuery).text).toBe("plain text");
    });

    it("answers with empty text when reading the clipboard throws", async () => {
        const { mediator, clipboard, notifier, editorStore } = createMediator();
        clipboard.readClipboard.mockRejectedValue(new Error("denied"));

        await mediator.readTextClipboard(EDITOR);

        expect(notifier.logError).toHaveBeenCalledOnce();
        expect(editorStore.postMessage).toHaveBeenCalledOnce();
        const msg = editorStore.postMessage.mock.calls[0][1];
        expect(msg).toBeInstanceOf(TextClipboardQuery);
        expect((msg as TextClipboardQuery).text).toBe("");
    });

    it("logs, without throwing, a reply that cannot be posted", async () => {
        const { mediator, notifier, editorStore } = createMediator();
        editorStore.postMessage.mockImplementation(() => {
            throw new Error("No editor found");
        });

        await expect(mediator.readTextClipboard(EDITOR)).resolves.toBeUndefined();
        expect(notifier.logError).toHaveBeenCalledExactlyOnceWith(new Error("No editor found"));
    });
});

describe("BpmnClipboardMediator.writeClipboard", () => {
    it("writes the text to the host clipboard", async () => {
        const { mediator, clipboard } = createMediator();

        await mediator.writeClipboard("payload");

        expect(clipboard.writeClipboard).toHaveBeenCalledWith("payload");
    });

    it("swallows and logs a write failure", async () => {
        const { mediator, clipboard, notifier } = createMediator();
        clipboard.writeClipboard.mockRejectedValue(new Error("write failed"));

        await expect(mediator.writeClipboard("payload")).resolves.toBeUndefined();
        expect(notifier.logError).toHaveBeenCalledOnce();
    });
});
