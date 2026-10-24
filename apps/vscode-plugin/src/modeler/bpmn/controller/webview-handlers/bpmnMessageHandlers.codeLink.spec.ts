import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
    Uri: { file: (path: string) => ({ scheme: "file", path, fsPath: path }) },
}));

import { NavigateToImplementationCommand } from "@miragon/bpmn-modeler-shared";
import { createTestHost } from "@miragon/bpmn-modeler-core/testing";

import { navigateToImplementationHandler } from "./bpmnMessageHandlers";

function createHandler() {
    const host = createTestHost();
    const editor = host.openEditor("/src/a.bpmn");
    host.openEditor("/src/b.bpmn");
    const implementationNavigationService = { navigate: vi.fn().mockResolvedValue(undefined) };
    const notifier = { logWarning: vi.fn() };

    const handler = navigateToImplementationHandler(
        host.store,
        implementationNavigationService as never,
        notifier as never,
    );
    return { handler, editor, implementationNavigationService, notifier };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("navigateToImplementationHandler", () => {
    it("forwards a javaClass command to the service with the editor's document path", async () => {
        const { handler, editor, implementationNavigationService } = createHandler();

        await handler(
            new NavigateToImplementationCommand("com.example.MyDelegate", "javaClass"),
            editor.id,
        );

        expect(implementationNavigationService.navigate).toHaveBeenCalledWith(
            "com.example.MyDelegate",
            "javaClass",
            "/src/a.bpmn",
        );
    });

    it("forwards a jobType command unchanged", async () => {
        const { handler, editor, implementationNavigationService } = createHandler();

        await handler(new NavigateToImplementationCommand("payment-service", "jobType"), editor.id);

        expect(implementationNavigationService.navigate).toHaveBeenCalledWith(
            "payment-service",
            "jobType",
            "/src/a.bpmn",
        );
    });

    it("rejects unknown kind values with a logWarning and no service call", async () => {
        const { handler, editor, notifier, implementationNavigationService } = createHandler();
        // Simulate protocol drift / a hostile webview sending an unexpected
        // discriminant by bypassing the command's compile-time type.
        const malformed = {
            type: "NavigateToImplementationCommand",
            reference: "X",
            kind: "anything",
        };

        await handler(malformed as never, editor.id);

        expect(notifier.logWarning).toHaveBeenCalledWith(
            expect.stringContaining("unknown kind: anything"),
        );
        expect(implementationNavigationService.navigate).not.toHaveBeenCalled();
    });
});
