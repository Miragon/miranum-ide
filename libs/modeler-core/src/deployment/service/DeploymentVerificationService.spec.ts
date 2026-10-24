import { describe, expect, it, vi } from "vitest";

import { EngineInspectionFailedError } from "../../shared/domain/errors";
import { createTestHost } from "../../testing";
import { NoAuth } from "../domain/deployment";
import { contentFingerprint, DeploymentTargetIdentity } from "../domain/deploymentLedger";
import { DeploymentTarget } from "../domain/deploymentTarget";
import { EngineDeploymentSnapshot } from "../domain/deploymentVerification";
import { DeploymentVerificationService } from "./DeploymentVerificationService";

const FILE_PATH = "/work/order-process.bpmn";
const XML = '<bpmn:process id="order"/>';

const c7Target = new DeploymentTarget(
    "dev",
    "c7",
    "http://localhost:8080/engine-rest",
    "",
    "none",
    "",
    "",
);
const c8Target = new DeploymentTarget("cloud", "c8", "https://c8.example.com", "", "none", "", "");
const identity = DeploymentTargetIdentity.fromTarget(c7Target);

const snapshot = (overrides: Partial<EngineDeploymentSnapshot> = {}): EngineDeploymentSnapshot => ({
    processDefinitionId: "order:3:def-1",
    deploymentId: "dep-9",
    resourceName: "order.bpmn",
    xml: XML,
    deploymentTime: "2026-09-17T14:40:00.000Z",
    ...overrides,
});

function createService(content = XML) {
    const host = createTestHost();
    const editor = host.openEditor(FILE_PATH, content);
    const deploymentTargetService = {
        getActiveTarget: vi.fn().mockResolvedValue(c7Target),
        getCredentials: vi.fn().mockResolvedValue(new NoAuth()),
    };
    const deploymentStatusService = {
        getRevision: vi.fn().mockReturnValue(undefined),
        adoptRevision: vi.fn().mockResolvedValue(undefined),
        forgetRevision: vi.fn().mockResolvedValue(undefined),
        refreshActive: vi.fn().mockResolvedValue(undefined),
    };
    const inspection = {
        fetchLatestDefinition: vi.fn().mockResolvedValue(snapshot()),
    };

    const service = new DeploymentVerificationService(
        host.store,
        host.documents,
        deploymentTargetService as never,
        deploymentStatusService as never,
        inspection as never,
        host.notifier,
    );

    return {
        service,
        host,
        editor,
        deploymentTargetService,
        deploymentStatusService,
        inspection,
    };
}

describe("DeploymentVerificationService.verifyActive", () => {
    it("reports when no diagram is focused", async () => {
        const c = createService();
        c.host.store.unregister(c.editor.id, c.editor);

        await c.service.verifyActive();

        expect(c.host.notifier.infos).toEqual(["Open a BPMN diagram to verify its deployment."]);
        expect(c.inspection.fetchLatestDefinition).not.toHaveBeenCalled();
    });

    it("reports when no named target is active", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(undefined);

        await c.service.verifyActive("/work");

        expect(c.host.notifier.infos).toEqual([
            "Select a named Camunda 7 target to verify against.",
        ]);
        expect(c.inspection.fetchLatestDefinition).not.toHaveBeenCalled();
    });

    it("reports that C8 targets cannot be verified", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(c8Target);

        await c.service.verifyActive("/work");

        expect(c.host.notifier.infos).toEqual([
            "Verification is not available for Camunda 8 targets.",
        ]);
        expect(c.inspection.fetchLatestDefinition).not.toHaveBeenCalled();
    });

    it("shows an error when the diagram has no process id", async () => {
        const c = createService("<bpmn:definitions/>");

        await c.service.verifyActive("/work");

        expect(c.host.notifier.errors).toHaveLength(1);
        expect(c.inspection.fetchLatestDefinition).not.toHaveBeenCalled();
    });

    it("confirms a current deployment and re-stamps verifiedAt", async () => {
        const c = createService();
        const recorded = {
            fingerprint: contentFingerprint(XML),
            deployedAt: "2026-09-17T14:32:00.000Z",
            deploymentId: "dep-9",
            origin: "local" as const,
        };
        c.deploymentStatusService.getRevision.mockReturnValue(recorded);

        await c.service.verifyActive("/work");

        expect(c.inspection.fetchLatestDefinition).toHaveBeenCalledWith({
            endpoint: c7Target.endpoint,
            tenantId: "",
            processKey: "order",
            auth: expect.any(NoAuth),
        });
        expect(c.deploymentStatusService.adoptRevision).toHaveBeenCalledWith(
            FILE_PATH,
            identity,
            expect.objectContaining({ ...recorded, verifiedAt: expect.any(String) }),
        );
        expect(c.deploymentStatusService.refreshActive).toHaveBeenCalled();
        expect(c.host.notifier.infos).toEqual([
            expect.stringContaining("dev runs your last deployment"),
        ]);
    });

    it("adopts an engine revision matching this diagram", async () => {
        const c = createService();

        await c.service.verifyActive("/work");

        expect(c.deploymentStatusService.adoptRevision).toHaveBeenCalledWith(
            FILE_PATH,
            identity,
            expect.objectContaining({ origin: "engine", deploymentId: "dep-9" }),
        );
        expect(c.host.notifier.infos).toEqual([
            expect.stringContaining("dev runs exactly this diagram"),
        ]);
    });

    it("reports a differing engine deployment as information", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockResolvedValue(snapshot({ xml: "<different/>" }));

        await c.service.verifyActive("/work");

        expect(c.deploymentStatusService.adoptRevision).toHaveBeenCalledWith(
            FILE_PATH,
            identity,
            expect.objectContaining({ origin: "engine" }),
        );
        const deployedTime = new Date("2026-09-17T14:40:00.000Z").toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        });
        expect(c.host.notifier.infos).toEqual([
            `The version deployed on dev (deployed ${deployedTime}) differs from your diagram.`,
        ]);
        expect(c.host.notifier.errors).toEqual([]);
    });

    it("omits the deployment time when it is unavailable", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockResolvedValue(
            snapshot({ xml: "<different/>", deploymentTime: undefined }),
        );

        await c.service.verifyActive("/work");

        expect(c.host.notifier.infos).toEqual([
            "The version deployed on dev differs from your diagram.",
        ]);
        expect(c.host.notifier.errors).toEqual([]);
    });

    it("forgets the row when the process is not deployed", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockResolvedValue(undefined);

        await c.service.verifyActive("/work");

        expect(c.deploymentStatusService.forgetRevision).toHaveBeenCalledWith(FILE_PATH, identity);
        expect(c.deploymentStatusService.adoptRevision).not.toHaveBeenCalled();
        expect(c.host.notifier.infos).toEqual(["Process 'order' is not deployed on dev."]);
    });

    it("points at the target credentials on an auth failure, leaving the ledger untouched", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockRejectedValue(
            new EngineInspectionFailedError(401, "Unauthorized"),
        );

        await c.service.verifyActive("/work");

        expect(c.host.notifier.errors).toEqual([
            'Could not verify deployment on "dev" — check the target credentials.',
        ]);
        expect(c.deploymentStatusService.adoptRevision).not.toHaveBeenCalled();
        expect(c.deploymentStatusService.forgetRevision).not.toHaveBeenCalled();
    });

    it("routes other failures through notifyError, leaving the ledger untouched", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockRejectedValue(new Error("connection refused"));

        await c.service.verifyActive("/work");

        expect(c.host.notifier.errors).toEqual(["Could not verify deployment\nconnection refused"]);
        expect(c.host.notifier.logged("error")).toEqual(["connection refused"]);
        expect(c.deploymentStatusService.adoptRevision).not.toHaveBeenCalled();
        expect(c.deploymentStatusService.forgetRevision).not.toHaveBeenCalled();
    });

    it("runs the lookup inside a progress bracket naming the target", async () => {
        const c = createService();

        await c.service.verifyActive("/work");

        expect(c.host.notifier.progressTitles).toEqual(['Verifying on "dev"…']);
    });
});
