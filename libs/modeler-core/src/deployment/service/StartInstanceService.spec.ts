import { describe, expect, it, vi } from "vitest";

import { NoAuth } from "../domain/deployment";
import { StartInstanceConfig, StartInstanceResult } from "../domain/startInstance";
import { StartInstanceService } from "./StartInstanceService";
import { BpmnDocument } from "../../shared/domain/BpmnDocument";
import { createTestHost, TestHostOptions } from "../../testing";

// A real C7 document so `getProcessDefinitionKey` exercises the production
// `BpmnDocument.extractProcessId` regex against valid XML rather than a stub.
const C7_DOC = BpmnDocument.empty("c7", "7.24.0");

function createService(options: TestHostOptions = {}) {
    const host = createTestHost(options);
    const restClient = {
        startInstance: vi.fn(),
    };
    const artifactService = {
        getPayloadPaths: vi.fn(),
    };

    const service = new StartInstanceService(
        host.documents,
        host.workspace,
        restClient as never,
        host.notifier,
        host.picker,
        artifactService as never,
    );

    return { service, host, restClient, artifactService };
}

describe("StartInstanceService.getProcessDefinitionKey", () => {
    it("returns the process id extracted from the editor's BPMN content", () => {
        const { service, host } = createService();
        host.openEditor("/work/other.bpmn", "<bpmn:definitions/>");
        const editor = host.openEditor("/work/order.bpmn", C7_DOC.xml);

        expect(service.getProcessDefinitionKey(editor.id)).toBe("Process_0gjrx3e");
    });

    it("propagates the error when the content has no process element", () => {
        const { service, host } = createService();
        const editor = host.openEditor("/work/order.bpmn", "<bpmn:definitions/>");

        expect(() => service.getProcessDefinitionKey(editor.id)).toThrow();
    });
});

describe("StartInstanceService.selectPayloadFile", () => {
    it("shows an info notice and returns null when no payload files exist", async () => {
        const { service, host, artifactService } = createService();
        const editor = host.openEditor("/work/order.bpmn");
        artifactService.getPayloadPaths.mockResolvedValue([]);

        const result = await service.selectPayloadFile(editor.id);

        expect(result).toBeNull();
        expect(host.notifier.infos).toEqual([
            "No payload files found in <configFolder>/payloads/.",
        ]);
        expect(host.picker.prompts).toEqual([]);
    });

    it("walks up from the document directory and delegates selection to the picker", async () => {
        const payloads = ["/work/sub/payloads/a.json"];
        const picked = { filePath: payloads[0], label: "a.json" };
        const { service, host, artifactService } = createService({
            answers: { payloadFile: picked },
        });
        const editor = host.openEditor("/work/sub/order.bpmn");
        artifactService.getPayloadPaths.mockResolvedValue(payloads);

        const result = await service.selectPayloadFile(editor.id);

        expect(result).toBe(picked);
        // Discovery starts from the document's directory, not the file path.
        expect(artifactService.getPayloadPaths).toHaveBeenCalledWith("/work/sub");
        expect(host.picker.prompts).toEqual([{ method: "pickPayloadFile", args: [payloads] }]);
    });

    it("returns null when payloads exist but the user cancels the picker", async () => {
        const { service, host, artifactService } = createService();
        const editor = host.openEditor("/work/order.bpmn");
        artifactService.getPayloadPaths.mockResolvedValue(["/work/payloads/a.json"]);

        await expect(service.selectPayloadFile(editor.id)).resolves.toBeNull();
    });
});

describe("StartInstanceService.startInstance", () => {
    it("reads and parses the payload, then forwards a parsed config to the REST client", async () => {
        const { service, restClient } = createService({
            files: { "/work/payloads/a.json": '{"amount":42}' },
        });
        const success = new StartInstanceResult(true, "started", "pi-1");
        restClient.startInstance.mockResolvedValue(success);

        const result = await service.startInstance(
            "Process_0gjrx3e",
            "http://localhost:8080/engine-rest",
            "c7",
            new NoAuth(),
            "/work/payloads/a.json",
        );

        expect(result).toBe(success);
        const config = restClient.startInstance.mock.calls[0][0] as StartInstanceConfig;
        expect(config.processDefinitionKey).toBe("Process_0gjrx3e");
        expect(config.payload).toEqual({ amount: 42 });
    });

    it("passes a null payload when no payload path is given and never reads a file", async () => {
        const { service, host, restClient } = createService();
        const readFile = vi.spyOn(host.workspace, "readFile");
        const success = new StartInstanceResult(true, "started", "pi-1");
        restClient.startInstance.mockResolvedValue(success);

        await service.startInstance("Process_1", "http://c/api", "c8", new NoAuth(), "");

        const config = restClient.startInstance.mock.calls[0][0] as StartInstanceConfig;
        expect(config.payload).toBeNull();
        expect(readFile).not.toHaveBeenCalled();
    });

    it("passes a failed REST result straight through without logging", async () => {
        const { service, host, restClient } = createService();
        const failure = new StartInstanceResult(false, "rejected by server");
        restClient.startInstance.mockResolvedValue(failure);

        const result = await service.startInstance(
            "Process_1",
            "http://c/api",
            "c7",
            new NoAuth(),
            "",
        );

        expect(result).toBe(failure);
        expect(host.notifier.logged("error")).toEqual([]);
    });

    it("never throws: a rejected REST call becomes a failed result and is logged", async () => {
        const { service, host, restClient } = createService();
        restClient.startInstance.mockRejectedValue(new Error("network down"));

        const result = await service.startInstance(
            "Process_1",
            "http://c/api",
            "c7",
            new NoAuth(),
            "",
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe("network down");
        expect(host.notifier.logged("error")).toEqual(["network down"]);
    });

    it("never throws: malformed payload JSON becomes a failed result and skips the REST call", async () => {
        const { service, host, restClient } = createService({
            files: { "/work/payloads/bad.json": "{ not json" },
        });

        const result = await service.startInstance(
            "Process_1",
            "http://c/api",
            "c7",
            new NoAuth(),
            "/work/payloads/bad.json",
        );

        expect(result.success).toBe(false);
        expect(restClient.startInstance).not.toHaveBeenCalled();
        expect(host.notifier.logged("error")).toHaveLength(1);
    });
});
