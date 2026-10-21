import { describe, expect, it, vi } from "vitest";

import {
    CleanupDiagramQuery,
    CleanupReportCommand,
    DiagramFormattedCommand,
    FormatDiagramQuery,
} from "@miragon/bpmn-modeler-shared";
import type { CleanupItem, CleanupStatus, LayoutErrorCode } from "@miragon/bpmn-modeler-types";

import { BpmnLayoutService } from "./BpmnLayoutService";

const EDITOR = "file:///work/diagram.bpmn";
const NOTHING_TO_CLEAN = "Nothing to clean up — the diagram carries no leftovers.";

function createService({ userConfirms = false } = {}) {
    const editorStore = { postMessage: vi.fn().mockResolvedValue(true) };
    const notifier = {
        logInfo: vi.fn(),
        logError: vi.fn(),
        showInfo: vi.fn(),
        showError: vi.fn(),
    };
    const picker = { confirmDestructive: vi.fn().mockResolvedValue(userConfirms) };

    const service = new BpmnLayoutService(editorStore as never, notifier as never, picker as never);

    return { service, editorStore, notifier, picker };
}

function failedFormat(code?: LayoutErrorCode, detail?: string): DiagramFormattedCommand {
    return new DiagramFormattedCommand("failed", [], code, detail);
}

function cleanupReport(
    status: CleanupStatus,
    options: { items?: CleanupItem[]; applied?: boolean; detail?: string } = {},
): CleanupReportCommand {
    const { items = [], applied = false, detail } = options;
    return new CleanupReportCommand({ status, items, message: detail }, applied);
}

const leftovers: CleanupItem[] = [
    { kind: "orphan-di", id: "Shape_1", label: "Shape_1" },
    { kind: "empty-label-di", label: "Label of Task_1" },
];

describe("BpmnLayoutService.format", () => {
    it("asks the given editor to format its diagram", async () => {
        const { service, editorStore } = createService();

        await service.format(EDITOR);

        expect(editorStore.postMessage).toHaveBeenCalledOnce();
        const [editorId, query] = editorStore.postMessage.mock.calls[0];
        expect(editorId).toBe(EDITOR);
        expect(query).toBeInstanceOf(FormatDiagramQuery);
    });
});

describe("BpmnLayoutService.reportFormatted", () => {
    it("logs every engine remark, naming the element when known, without notifying", () => {
        const { service, notifier } = createService();

        service.reportFormatted(
            new DiagramFormattedCommand("formatted", [
                { message: "label overlaps", elementId: "Task_1" },
                { message: "lane resized" },
            ]),
        );

        expect(notifier.logInfo.mock.calls).toEqual([
            ["Format: label overlaps (Task_1)"],
            ["Format: lane resized"],
        ]);
        expect(notifier.showInfo).not.toHaveBeenCalled();
        expect(notifier.showError).not.toHaveBeenCalled();
    });

    it("tells the user when the diagram was already formatted", () => {
        const { service, notifier } = createService();

        service.reportFormatted(new DiagramFormattedCommand("unchanged", []));

        expect(notifier.showInfo).toHaveBeenCalledWith("The diagram is already formatted.");
        expect(notifier.showError).not.toHaveBeenCalled();
    });

    it.each<[LayoutErrorCode, string]>([
        ["UNSUPPORTED_SURFACE", "This diagram is read-only, so it cannot be formatted."],
        ["EMPTY_DIAGRAM", "There is nothing to format yet."],
        ["ENGINE_FAILED", "The diagram could not be formatted."],
        ["DIAGRAM_CHANGED", "The diagram changed while it was being formatted. Try again."],
        ["APPLY_FAILED", "The new layout could not be applied, so the diagram is unchanged."],
    ])("explains a %s refusal in user terms", (code, explanation) => {
        const { service, notifier } = createService();

        service.reportFormatted(failedFormat(code));

        expect(notifier.showError).toHaveBeenCalledWith(explanation);
        expect(notifier.logError).not.toHaveBeenCalled();
    });

    it("logs an engine failure and appends its detail to the error", () => {
        const { service, notifier } = createService();

        service.reportFormatted(failedFormat("ENGINE_FAILED", "boom"));

        expect(notifier.logError).toHaveBeenCalledWith("Format failed: boom");
        expect(notifier.showError).toHaveBeenCalledWith("The diagram could not be formatted. boom");
    });

    it("logs the detail of any other refusal but keeps it out of the error", () => {
        const { service, notifier } = createService();

        service.reportFormatted(failedFormat("APPLY_FAILED", "modeling threw"));

        expect(notifier.logError).toHaveBeenCalledWith("Format failed: modeling threw");
        expect(notifier.showError).toHaveBeenCalledWith(
            "The new layout could not be applied, so the diagram is unchanged.",
        );
    });

    it("falls back to the engine-failure copy, without the detail, when no code is given", () => {
        const { service, notifier } = createService();

        service.reportFormatted(failedFormat(undefined, "boom"));

        expect(notifier.logError).toHaveBeenCalledWith("Format failed: boom");
        expect(notifier.showError).toHaveBeenCalledWith("The diagram could not be formatted.");
    });

    it("has no copy for a code outside the protocol union", () => {
        const { service, notifier } = createService();

        service.reportFormatted(failedFormat("NOT_A_CODE" as never));

        expect(notifier.showError).toHaveBeenCalledWith(undefined);
    });
});

describe("BpmnLayoutService.inspectCleanup", () => {
    it("asks the given editor for a cleanup report without applying anything", async () => {
        const { service, editorStore } = createService();

        await service.inspectCleanup(EDITOR);

        expect(editorStore.postMessage).toHaveBeenCalledOnce();
        const [editorId, query] = editorStore.postMessage.mock.calls[0];
        expect(editorId).toBe(EDITOR);
        expect(query).toBeInstanceOf(CleanupDiagramQuery);
        expect((query as CleanupDiagramQuery).apply).toBe(false);
    });
});

describe("BpmnLayoutService.reportCleanup", () => {
    it.each([
        [false, "The diagram could not be checked for leftovers."],
        [true, "The leftovers could not be removed, so the diagram is unchanged."],
    ])("reports a failure (applied=%s) without asking to clean up", async (applied, error) => {
        const { service, notifier, picker, editorStore } = createService();

        await service.reportCleanup(cleanupReport("failed", { applied, detail: "x" }), EDITOR);

        expect(notifier.logError).toHaveBeenCalledWith("Cleanup failed: x");
        expect(notifier.showError).toHaveBeenCalledWith(error);
        expect(notifier.showInfo).not.toHaveBeenCalled();
        expect(picker.confirmDestructive).not.toHaveBeenCalled();
        expect(editorStore.postMessage).not.toHaveBeenCalled();
    });

    it("logs nothing for a failure that carries no detail", async () => {
        const { service, notifier } = createService();

        await service.reportCleanup(cleanupReport("failed"), EDITOR);

        expect(notifier.logError).not.toHaveBeenCalled();
        expect(notifier.showError).toHaveBeenCalledOnce();
    });

    it("confirms how many items an applied cleanup removed", async () => {
        const { service, notifier } = createService();

        await service.reportCleanup(
            cleanupReport("applied", { items: leftovers, applied: true }),
            EDITOR,
        );

        expect(notifier.showInfo).toHaveBeenCalledWith("Cleaned up 2 item(s).");
    });

    it("says there was nothing to clean up when an applied cleanup removed nothing", async () => {
        const { service, notifier } = createService();

        await service.reportCleanup(cleanupReport("applied", { applied: true }), EDITOR);

        expect(notifier.showInfo).toHaveBeenCalledWith(NOTHING_TO_CLEAN);
    });

    it("does not ask for confirmation when the report is empty", async () => {
        const { service, notifier, picker, editorStore } = createService();

        await service.reportCleanup(cleanupReport("reported"), EDITOR);

        expect(notifier.showInfo).toHaveBeenCalledWith(NOTHING_TO_CLEAN);
        expect(picker.confirmDestructive).not.toHaveBeenCalled();
        expect(editorStore.postMessage).not.toHaveBeenCalled();
    });

    it("applies the cleanup only after the user confirms the listed leftovers", async () => {
        const { service, picker, editorStore } = createService({ userConfirms: true });

        await service.reportCleanup(cleanupReport("reported", { items: leftovers }), EDITOR);

        expect(picker.confirmDestructive).toHaveBeenCalledWith({
            title: "Remove 2 leftover item(s) from this diagram?",
            confirmLabel: "Clean Up",
            details: ["Shape_1", "Label of Task_1"],
        });
        expect(editorStore.postMessage).toHaveBeenCalledOnce();
        const [editorId, query] = editorStore.postMessage.mock.calls[0];
        expect(editorId).toBe(EDITOR);
        expect(query).toBeInstanceOf(CleanupDiagramQuery);
        expect((query as CleanupDiagramQuery).apply).toBe(true);
    });

    it("removes nothing when the user declines", async () => {
        const { service, notifier, picker, editorStore } = createService({ userConfirms: false });

        await service.reportCleanup(cleanupReport("reported", { items: leftovers }), EDITOR);

        expect(picker.confirmDestructive).toHaveBeenCalledOnce();
        expect(editorStore.postMessage).not.toHaveBeenCalled();
        expect(notifier.showInfo).not.toHaveBeenCalled();
    });
});
