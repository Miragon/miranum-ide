import { describe, expect, it, vi } from "vitest";

import { EditorSessionStore } from "@miragon/bpmn-modeler-core";

import { VsCodeDocument } from "./VsCodeDocument";

const ORDER_ID = "file:///work/order.bpmn";
const INVOICE_ID = "file:///work/invoice.bpmn";

function fakeHandle(id: string, content: string) {
    return {
        id,
        getContent: () => content,
        documentPath: () => new URL(id).pathname,
        writeContent: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockResolvedValue(true),
        dispose: vi.fn(),
    };
}

function openEditors() {
    const editorStore = new EditorSessionStore(() => undefined);
    const order = fakeHandle(ORDER_ID, "<order/>");
    const invoice = fakeHandle(INVOICE_ID, "<invoice/>");
    editorStore.register(order as never);
    editorStore.register(invoice as never);
    return { editorStore, order, invoice, document: new VsCodeDocument(editorStore) };
}

describe("VsCodeDocument", () => {
    it("routes every operation to the addressed editor, not the active one", async () => {
        const { order, invoice, document } = openEditors();

        expect(document.getContent(ORDER_ID)).toBe("<order/>");
        expect(document.getFilePath(ORDER_ID)).toBe("/work/order.bpmn");
        await document.save(ORDER_ID);

        expect(order.save).toHaveBeenCalledOnce();
        expect(invoice.save).not.toHaveBeenCalled();
    });

    it("writes webview content based on the current host revision", async () => {
        const { editorStore, order, document } = openEditors();
        const revision = editorStore.markHostDocumentUpdated(ORDER_ID);

        await expect(document.write(ORDER_ID, "<edited/>", revision)).resolves.toBe(true);
        expect(order.writeContent).toHaveBeenCalledWith("<edited/>", revision);
    });

    it("drops webview content based on a revision the host has since replaced", async () => {
        const { editorStore, order, document } = openEditors();
        const staleRevision = editorStore.markHostDocumentUpdated(ORDER_ID);
        editorStore.markHostDocumentUpdated(ORDER_ID);

        await expect(document.write(ORDER_ID, "<stale/>", staleRevision)).resolves.toBe(false);
        expect(order.writeContent).not.toHaveBeenCalled();
    });

    it("always writes host-initiated content that carries no revision", async () => {
        const { editorStore, order, document } = openEditors();
        editorStore.markHostDocumentUpdated(ORDER_ID);

        await expect(document.write(ORDER_ID, "<migrated/>")).resolves.toBe(true);
        expect(order.writeContent).toHaveBeenCalledWith("<migrated/>", undefined);
    });
});
