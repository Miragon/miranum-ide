import { describe, expect, it, vi } from "vitest";

import { createTestHost, PickerAnswers } from "../../testing";
import { DeploymentTarget } from "../domain/deploymentTarget";
import {
    contentFingerprint,
    DeploymentTargetIdentity,
    ledgerKeyFor,
} from "../domain/deploymentLedger";
import { DeploymentStatusService } from "./DeploymentStatusService";

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

const FILE_PATH = "/work/order-process.bpmn";
const target = (name: string): DeploymentTarget =>
    new DeploymentTarget(name, "c7", "http://localhost:8080/engine-rest", "", "none", "", "");

function createService(answers: PickerAnswers = {}) {
    const host = createTestHost({ answers });
    const editor = host.openEditor(FILE_PATH, "<a/>");
    const deploymentTargetService = {
        getActiveTarget: vi.fn().mockResolvedValue(undefined),
    };

    const service = new DeploymentStatusService(
        host.store,
        host.documents,
        deploymentTargetService as never,
        host.deploymentState,
        host.statusBar,
        host.picker,
        host.notifier,
    );

    return { service, host, editor, deploymentTargetService };
}

const DEV_KEY = "target:dev@localhost:8080::/work/order-process.bpmn";

describe("DeploymentStatusService.recordDeployment", () => {
    it("stores a fingerprint + timestamp under the identity/file ledger key", async () => {
        const c = createService();

        await c.service.recordDeployment(
            FILE_PATH,
            "<a/>",
            DeploymentTargetIdentity.fromTarget(target("dev")),
            "dep-42",
        );

        expect(c.host.deploymentState.ledger.get(DEV_KEY)).toEqual(
            expect.objectContaining({
                fingerprint: contentFingerprint("<a/>"),
                deploymentId: "dep-42",
                origin: "local",
            }),
        );
    });
});

describe("DeploymentStatusService ledger writes", () => {
    const identity = () => DeploymentTargetIdentity.fromTarget(target("dev"));

    it("adopts an engine revision under the identity/file key", async () => {
        const c = createService();
        const revision = {
            fingerprint: contentFingerprint("<a/>"),
            deployedAt: "2026-09-17T14:40:00.000Z",
            deploymentId: "dep-9",
            origin: "engine" as const,
            verifiedAt: "2026-09-17T15:00:00.000Z",
        };

        await c.service.adoptRevision(FILE_PATH, identity(), revision);

        expect(c.host.deploymentState.ledger.get(DEV_KEY)).toEqual(revision);
    });

    it("forgets a single revision", async () => {
        const c = createService();
        const otherKey = "target:dev@localhost:8080::/work/other.bpmn";
        await c.host.deploymentState.saveDeployedRevision(DEV_KEY, {
            fingerprint: "a",
            deployedAt: "",
        });
        await c.host.deploymentState.saveDeployedRevision(otherKey, {
            fingerprint: "b",
            deployedAt: "",
        });

        await c.service.forgetRevision(FILE_PATH, identity());

        expect(c.host.deploymentState.listLedgerKeys()).toEqual([otherKey]);
    });

    it("prunes exactly the identity's rows", async () => {
        const c = createService();
        const keys = [
            "target:dev@localhost:8080::/work/a.bpmn",
            "target:dev@localhost:8080::/work/b.bpmn",
            "target:dev@other.example.com::/work/a.bpmn",
            "target:prod@localhost:8080::/work/a.bpmn",
        ];
        for (const key of keys) {
            await c.host.deploymentState.saveDeployedRevision(key, {
                fingerprint: "f",
                deployedAt: "",
            });
        }

        await c.service.pruneTarget(identity());

        expect(c.host.deploymentState.listLedgerKeys()).toEqual([
            "target:dev@other.example.com::/work/a.bpmn",
            "target:prod@localhost:8080::/work/a.bpmn",
        ]);
    });

    it("skips the delete round-trip when nothing matches", async () => {
        const c = createService();
        const deleteDeployedRevisions = vi.spyOn(c.host.deploymentState, "deleteDeployedRevisions");

        await c.service.pruneTarget(identity());

        expect(deleteDeployedRevisions).not.toHaveBeenCalled();
    });
});

describe("DeploymentStatusService.pickStatusBarAction", () => {
    it("offers verify for a named C7 target", async () => {
        const c = createService({ deploymentStatusAction: "verify" });
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));

        await expect(c.service.pickStatusBarAction("/work")).resolves.toBe("verify");

        expect(c.host.picker.prompts).toEqual([
            {
                method: "pickDeploymentStatusAction",
                args: [{ targetName: "dev", canVerify: true }],
            },
        ]);
    });

    it("withholds verify without a named target", async () => {
        const c = createService();

        await c.service.pickStatusBarAction();

        expect(c.host.picker.prompts).toEqual([
            {
                method: "pickDeploymentStatusAction",
                args: [{ targetName: undefined, canVerify: false }],
            },
        ]);
    });

    it("withholds verify for a Camunda 8 target", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(
            new DeploymentTarget("cloud", "c8", "https://c8.example.com", "", "none", "", ""),
        );

        await c.service.pickStatusBarAction();

        expect(c.host.picker.prompts).toEqual([
            {
                method: "pickDeploymentStatusAction",
                args: [{ targetName: "cloud", canVerify: false }],
            },
        ]);
    });
});

describe("DeploymentStatusService.refresh", () => {
    it("ignores requests from an inactive editor", async () => {
        const c = createService();
        c.host.statusBar.showDeploymentTarget("shown", "deployed");
        const shown = c.host.statusBar.deploymentTarget;
        await c.service.refresh("background");
        expect(c.host.statusBar.deploymentTarget).toBe(shown);
    });

    it.each(["resolve", "reject"])("ignores a stale lookup that later %s", async (outcome) => {
        const c = createService();
        const pending = deferred<DeploymentTarget | undefined>();
        c.deploymentTargetService.getActiveTarget.mockReturnValueOnce(pending.promise);
        const oldRefresh = c.service.refresh(c.editor.id);
        const other = c.host.openEditor("/work/other.bpmn", "<a/>");
        await c.service.refresh(other.id);
        const shown = c.host.statusBar.deploymentTarget;
        if (outcome === "resolve") pending.resolve(target("old"));
        else pending.reject(new Error("stale error"));
        await oldRefresh;
        expect(c.host.statusBar.deploymentTarget).toBe(shown);
    });

    it("invalidates pending refreshes when hidden, even if the active pointer is unchanged", async () => {
        const c = createService();
        const pending = deferred<DeploymentTarget | undefined>();
        c.deploymentTargetService.getActiveTarget.mockReturnValueOnce(pending.promise);
        const refresh = c.service.refresh(c.editor.id);
        c.service.hide();
        pending.resolve(target("old"));
        await refresh;
        expect(c.host.statusBar.deploymentTarget).toBeUndefined();
    });

    it("only publishes the newest lookup for the same editor", async () => {
        const c = createService();
        const pending = deferred<DeploymentTarget | undefined>();
        c.deploymentTargetService.getActiveTarget.mockReturnValueOnce(pending.promise);
        const old = c.service.refresh(c.editor.id);
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("new"));
        await c.service.refresh(c.editor.id);
        const shown = c.host.statusBar.deploymentTarget;
        pending.resolve(target("old"));
        await old;
        expect(shown).toEqual({
            name: "new",
            freshness: "unknown",
            deployedAt: undefined,
            verifiedAt: undefined,
        });
        expect(c.host.statusBar.deploymentTarget).toBe(shown);
    });
    it("renders unknown when no revision is recorded", async () => {
        const c = createService();

        await c.service.refresh(c.editor.id);

        expect(c.host.statusBar.deploymentTarget).toEqual({
            name: undefined,
            freshness: "unknown",
            deployedAt: undefined,
            verifiedAt: undefined,
        });
    });

    it("renders deployed (green) when content matches the recorded fingerprint", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));
        await c.host.deploymentState.saveDeployedRevision(
            ledgerKeyFor(DeploymentTargetIdentity.fromTarget(target("dev")), FILE_PATH),
            {
                fingerprint: contentFingerprint("<a/>"),
                deployedAt: "2026-09-17T14:32:00.000Z",
            },
        );

        await c.service.refresh(c.editor.id);

        expect(c.host.statusBar.deploymentTarget).toEqual({
            name: "dev",
            freshness: "deployed",
            deployedAt: "2026-09-17T14:32:00.000Z",
            verifiedAt: undefined,
        });
    });

    it("renders changed (yellow) when content differs from the recorded fingerprint", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));
        c.editor.content = "<b/>";
        await c.host.deploymentState.saveDeployedRevision(DEV_KEY, {
            fingerprint: contentFingerprint("<a/>"),
            deployedAt: "2026-09-17T14:32:00.000Z",
        });

        await c.service.refresh(c.editor.id);

        expect(c.host.statusBar.deploymentTarget).toEqual({
            name: "dev",
            freshness: "changed",
            deployedAt: "2026-09-17T14:32:00.000Z",
            verifiedAt: undefined,
        });
    });

    it("renders superseded (blue) and passes verifiedAt for an engine-origin mismatch", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));
        c.editor.content = "<b/>";
        await c.host.deploymentState.saveDeployedRevision(DEV_KEY, {
            fingerprint: contentFingerprint("<a/>"),
            deployedAt: "2026-09-17T14:40:00.000Z",
            origin: "engine",
            verifiedAt: "2026-09-17T15:00:00.000Z",
        });

        await c.service.refresh(c.editor.id);

        expect(c.host.statusBar.deploymentTarget).toEqual({
            name: "dev",
            freshness: "superseded",
            deployedAt: "2026-09-17T14:40:00.000Z",
            verifiedAt: "2026-09-17T15:00:00.000Z",
        });
    });

    it("hides the item when the editor has no resolvable document", async () => {
        const c = createService();
        c.host.statusBar.showDeploymentTarget("shown", "deployed");
        vi.spyOn(c.host.documents, "getFilePath").mockImplementation(() => {
            throw new Error("no active editor");
        });

        await c.service.refresh(c.editor.id);

        expect(c.host.statusBar.deploymentTarget).toBeUndefined();
    });
});
