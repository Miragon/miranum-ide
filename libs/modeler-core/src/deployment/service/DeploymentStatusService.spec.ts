import { beforeEach, describe, expect, it, vi } from "vitest";

import { CredentialRefs } from "../domain/credentialRefs";
import { DeploymentTarget } from "../domain/deploymentTarget";
import {
    contentFingerprint,
    DeploymentTargetIdentity,
    ledgerKeyFor,
} from "../domain/deploymentLedger";
import { EnvLookup, NO_ENV_VARIABLES } from "../domain/envRef";
import { DeploymentStatusService } from "./DeploymentStatusService";
import { EnvValueResolver } from "./EnvValueResolver";

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
const LITERAL_ENDPOINT = "http://localhost:8080/engine-rest";
const PROD_URL = "https://prod.example.com/engine-rest";
const PROD_HOST = "prod.example.com";
const PROD_DOT_ENV = { MIRAGON_URL: PROD_URL };
const noEnv = () => undefined;
const lookupOf =
    (dotEnv: Record<string, string>): EnvLookup =>
    (name) =>
        dotEnv[name];
const target = (name: string): DeploymentTarget =>
    new DeploymentTarget(name, "c7", LITERAL_ENDPOINT, "", "none", "", "");
const endpointRefTarget = (): DeploymentTarget =>
    new DeploymentTarget("dev", "c7", "${env:MIRAGON_URL}", "", "none", "", "");
const credentialRefTarget = (): DeploymentTarget =>
    new DeploymentTarget(
        "dev",
        "c7",
        LITERAL_ENDPOINT,
        "",
        "basic",
        "",
        "",
        undefined,
        undefined,
        CredentialRefs.basic(undefined, "${env:MIRAGON_PW}"),
    );
const tenantRefTarget = (): DeploymentTarget =>
    new DeploymentTarget("dev", "c7", LITERAL_ENDPOINT, "${env:MIRAGON_TENANT}", "none", "", "");
const urlRefTarget = (): DeploymentTarget =>
    new DeploymentTarget(
        "dev",
        "c7",
        LITERAL_ENDPOINT,
        "",
        "none",
        "",
        "",
        "${env:MIRAGON_DEPLOY_URL}",
        "${env:MIRAGON_START_URL}",
    );
const NESTED_PROJECT_DIR = "/work/team";

function dotEnvContent(dotEnv: Record<string, string>): string {
    return Object.entries(dotEnv)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
}

function createService(dotEnv: Record<string, string> = {}) {
    const editorStore = {
        getActiveEditorId: vi.fn().mockReturnValue("editor-1"),
    };
    const documentPort = {
        getFilePath: vi.fn().mockReturnValue(FILE_PATH),
        getContent: vi.fn().mockReturnValue("<a/>"),
    };
    const deploymentTargetService = {
        getActiveTarget: vi.fn().mockResolvedValue(undefined),
        locateTargetsFile: vi.fn().mockResolvedValue({
            filePath: "/work/.camunda/deployment-targets.json",
            exists: true,
            projectDir: "/work",
        }),
    };
    const deploymentState = {
        getEndpoint: vi.fn().mockReturnValue(LITERAL_ENDPOINT),
        getTenantId: vi.fn().mockReturnValue(""),
        getDeployedRevision: vi.fn().mockReturnValue(undefined),
        saveDeployedRevision: vi.fn().mockResolvedValue(undefined),
        listLedgerKeys: vi.fn().mockReturnValue([]),
        deleteDeployedRevisions: vi.fn().mockResolvedValue(undefined),
    };
    const statusBar = {
        showDeploymentTarget: vi.fn(),
        hideDeploymentTarget: vi.fn(),
    };
    const picker = {
        pickDeploymentStatusAction: vi.fn().mockResolvedValue(undefined),
    };
    const notifier = {
        logDebug: vi.fn(),
    };
    const workspace = {
        findWorkspaceFolderForDocument: vi.fn().mockReturnValue("/work"),
        isSymbolicLink: vi.fn().mockResolvedValue(false),
        readFile: vi.fn().mockResolvedValue(dotEnvContent(dotEnv)),
    };

    const service = new DeploymentStatusService(
        editorStore as never,
        documentPort as never,
        deploymentTargetService as never,
        deploymentState as never,
        statusBar as never,
        picker as never,
        notifier as never,
        new EnvValueResolver(deploymentTargetService as never, workspace as never),
    );

    return {
        service,
        editorStore,
        documentPort,
        deploymentTargetService,
        deploymentState,
        statusBar,
        picker,
        notifier,
        workspace,
    };
}

type ServiceContext = ReturnType<typeof createService>;

const UNREADABLE_DOT_ENVS: [string, (c: ServiceContext) => void][] = [
    ["symlinked", (c) => c.workspace.isSymbolicLink.mockResolvedValue(true)],
    [
        "a directory",
        (c) => c.workspace.readFile.mockRejectedValue(new Error("EISDIR: illegal operation")),
    ],
];

function useAdHocConnection(c: ServiceContext, endpoint: string, tenantId: string): void {
    c.deploymentState.getEndpoint.mockReturnValue(endpoint);
    c.deploymentState.getTenantId.mockReturnValue(tenantId);
}

function readLedgerKey(c: ServiceContext): string {
    expect(c.deploymentState.getDeployedRevision).toHaveBeenCalledOnce();
    return c.deploymentState.getDeployedRevision.mock.calls[0][0] as string;
}

function expectNoDotEnvIo(c: ServiceContext): void {
    expect(c.deploymentTargetService.locateTargetsFile).not.toHaveBeenCalled();
    expect(c.workspace.isSymbolicLink).not.toHaveBeenCalled();
    expect(c.workspace.readFile).not.toHaveBeenCalled();
}

/**
 * Workspace folder `/work` holding a nested project whose targets file is the
 * one in use; `dotEnvs` maps each `.env` path to its variables.
 */
function useNestedProject(c: ServiceContext, dotEnvs: Record<string, Record<string, string>>) {
    c.documentPort.getFilePath.mockReturnValue(`${NESTED_PROJECT_DIR}/order-process.bpmn`);
    c.deploymentTargetService.locateTargetsFile.mockResolvedValue({
        filePath: `${NESTED_PROJECT_DIR}/.camunda/deployment-targets.json`,
        exists: true,
        projectDir: NESTED_PROJECT_DIR,
    });
    c.workspace.readFile.mockImplementation(async (path: string) =>
        dotEnvContent(dotEnvs[path] ?? {}),
    );
}

beforeEach(() => vi.clearAllMocks());

describe("DeploymentStatusService.recordDeployment", () => {
    it("stores a fingerprint + timestamp under the identity/file ledger key", async () => {
        const c = createService();

        await c.service.recordDeployment(
            FILE_PATH,
            "<a/>",
            DeploymentTargetIdentity.fromTarget(target("dev"), noEnv),
            "dep-42",
        );

        expect(c.deploymentState.saveDeployedRevision).toHaveBeenCalledWith(
            "target:dev@localhost:8080::/work/order-process.bpmn",
            expect.objectContaining({
                fingerprint: contentFingerprint("<a/>"),
                deploymentId: "dep-42",
                origin: "local",
            }),
        );
    });
});

describe("DeploymentStatusService ledger writes", () => {
    const identity = () => DeploymentTargetIdentity.fromTarget(target("dev"), noEnv);

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

        expect(c.deploymentState.saveDeployedRevision).toHaveBeenCalledWith(
            "target:dev@localhost:8080::/work/order-process.bpmn",
            revision,
        );
    });

    it("forgets a single revision", async () => {
        const c = createService();

        await c.service.forgetRevision(FILE_PATH, identity());

        expect(c.deploymentState.deleteDeployedRevisions).toHaveBeenCalledWith([
            "target:dev@localhost:8080::/work/order-process.bpmn",
        ]);
    });

    it("prunes exactly the identity's rows", async () => {
        const c = createService();
        c.deploymentState.listLedgerKeys.mockReturnValue([
            "target:dev@localhost:8080::/work/a.bpmn",
            "target:dev@localhost:8080::/work/b.bpmn",
            "target:dev@other.example.com::/work/a.bpmn",
            "target:prod@localhost:8080::/work/a.bpmn",
        ]);

        await c.service.pruneTarget(identity());

        expect(c.deploymentState.deleteDeployedRevisions).toHaveBeenCalledWith([
            "target:dev@localhost:8080::/work/a.bpmn",
            "target:dev@localhost:8080::/work/b.bpmn",
        ]);
    });

    it("skips the delete round-trip when nothing matches", async () => {
        const c = createService();

        await c.service.pruneTarget(identity());

        expect(c.deploymentState.deleteDeployedRevisions).not.toHaveBeenCalled();
    });

    it("prunes the rows an endpoint-ref target recorded under its resolved host", async () => {
        const c = createService(PROD_DOT_ENV);
        const recordedRow = ledgerKeyFor(
            DeploymentTargetIdentity.fromTarget(endpointRefTarget(), lookupOf(PROD_DOT_ENV)),
            "/work/a.bpmn",
        );
        const otherHostRow = ledgerKeyFor(
            DeploymentTargetIdentity.fromTarget(
                endpointRefTarget(),
                lookupOf({ MIRAGON_URL: "https://staging.example.com/engine-rest" }),
            ),
            "/work/a.bpmn",
        );
        c.deploymentState.listLedgerKeys.mockReturnValue([recordedRow, otherHostRow]);

        await c.service.pruneTarget(await c.service.targetIdentity(endpointRefTarget(), "/work"));

        expect(c.deploymentState.deleteDeployedRevisions).toHaveBeenCalledExactlyOnceWith([
            recordedRow,
        ]);
    });

    it.each(UNREADABLE_DOT_ENVS)(
        "does not fail pruning an endpoint-ref target when .env is %s, leaving its resolved-key rows in place",
        async (_desc, breakDotEnv) => {
            const c = createService(PROD_DOT_ENV);
            breakDotEnv(c);
            // Recorded while .env was still readable; unreachable now, an accepted residual.
            const recordedRow = ledgerKeyFor(
                DeploymentTargetIdentity.fromTarget(endpointRefTarget(), lookupOf(PROD_DOT_ENV)),
                "/work/a.bpmn",
            );
            c.deploymentState.listLedgerKeys.mockReturnValue([recordedRow]);

            const pruning = c.service
                .targetIdentity(endpointRefTarget(), "/work")
                .then((identity) => c.service.pruneTarget(identity));

            await expect(pruning).resolves.toBeUndefined();
            expect(c.deploymentState.deleteDeployedRevisions).not.toHaveBeenCalled();
            expect(c.notifier.logDebug).toHaveBeenCalledWith(expect.stringContaining(".env"));
        },
    );
});

describe("DeploymentStatusService.targetIdentity", () => {
    it("keys a literal target endpoint without any .env IO", async () => {
        const c = createService();

        const identity = await c.service.targetIdentity(target("dev"), "/work");

        expect(identity.key()).toBe("target:dev@localhost:8080");
        expect(c.deploymentTargetService.locateTargetsFile).not.toHaveBeenCalled();
        expect(c.workspace.isSymbolicLink).not.toHaveBeenCalled();
        expect(c.workspace.readFile).not.toHaveBeenCalled();
    });

    it.each<[string, DeploymentTarget]>([
        ["its credentials", credentialRefTarget()],
        ["its tenant", tenantRefTarget()],
        ["its deploy and start-instance URLs", urlRefTarget()],
    ])(
        "keys a target whose only refs are in %s by the literal host without any .env IO",
        async (_location, refOutsideEndpointTarget) => {
            const c = createService(PROD_DOT_ENV);

            const identity = await c.service.targetIdentity(refOutsideEndpointTarget, "/work");

            expect(identity.key()).toBe("target:dev@localhost:8080");
            expectNoDotEnvIo(c);
        },
    );

    it("keys an endpoint ref by the .env beside the targets file, not the workspace folder's", async () => {
        const c = createService();
        useNestedProject(c, {
            "/work/.env": { MIRAGON_URL: "https://workspace.example.com/engine-rest" },
            [`${NESTED_PROJECT_DIR}/.env`]: PROD_DOT_ENV,
        });

        const identity = await c.service.targetIdentity(endpointRefTarget(), NESTED_PROJECT_DIR);

        expect(identity.key()).toBe(
            DeploymentTargetIdentity.fromTarget(endpointRefTarget(), lookupOf(PROD_DOT_ENV)).key(),
        );
        expect(c.deploymentTargetService.locateTargetsFile).toHaveBeenCalledExactlyOnceWith(
            NESTED_PROJECT_DIR,
        );
        expect(c.workspace.readFile).toHaveBeenCalledExactlyOnceWith(`${NESTED_PROJECT_DIR}/.env`);
    });

    it("keys an endpoint ref by a fingerprint of the host it resolves to, never the host itself", async () => {
        const c = createService(PROD_DOT_ENV);

        const identity = await c.service.targetIdentity(endpointRefTarget(), "/work");

        expect(c.deploymentTargetService.locateTargetsFile).toHaveBeenCalledWith("/work");
        expect(c.workspace.readFile).toHaveBeenCalledWith("/work/.env");
        expect(identity.key()).toContain("env:");
        expect(identity.key()).not.toContain(PROD_HOST);
        expect(identity.key()).toBe(
            DeploymentTargetIdentity.fromTarget(endpointRefTarget(), lookupOf(PROD_DOT_ENV)).key(),
        );
        expect(identity.key()).not.toBe(
            DeploymentTargetIdentity.fromTarget(endpointRefTarget(), NO_ENV_VARIABLES).key(),
        );
    });

    it("changes the key when .env points the endpoint ref at another host", async () => {
        const prod = createService(PROD_DOT_ENV);
        const staging = createService({ MIRAGON_URL: "https://staging.example.com/engine-rest" });

        const prodKey = (await prod.service.targetIdentity(endpointRefTarget(), "/work")).key();
        const stagingKey = (
            await staging.service.targetIdentity(endpointRefTarget(), "/work")
        ).key();

        expect(stagingKey).not.toBe(prodKey);
    });

    it.each(UNREADABLE_DOT_ENVS)(
        "keys an endpoint ref by its unresolved reference when .env is %s",
        async (_desc, breakDotEnv) => {
            const c = createService(PROD_DOT_ENV);
            breakDotEnv(c);

            const identity = await c.service.targetIdentity(endpointRefTarget(), "/work");

            expect(identity.key()).toBe(
                DeploymentTargetIdentity.fromTarget(endpointRefTarget(), NO_ENV_VARIABLES).key(),
            );
            expect(identity.key()).not.toContain(PROD_HOST);
            expect(c.notifier.logDebug).toHaveBeenCalledWith(expect.stringContaining(".env"));
        },
    );

    it("propagates a failure other than an unreadable .env", async () => {
        const c = createService();
        c.deploymentTargetService.locateTargetsFile.mockRejectedValue(
            new Error("targets lookup failed"),
        );

        await expect(c.service.targetIdentity(endpointRefTarget(), "/work")).rejects.toThrow(
            "targets lookup failed",
        );
        expect(c.notifier.logDebug).not.toHaveBeenCalled();
    });
});

describe("DeploymentStatusService.pickStatusBarAction", () => {
    it("offers verify for a named C7 target", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));
        c.picker.pickDeploymentStatusAction.mockResolvedValue("verify");

        await expect(c.service.pickStatusBarAction("/work")).resolves.toBe("verify");

        expect(c.picker.pickDeploymentStatusAction).toHaveBeenCalledWith({
            targetName: "dev",
            canVerify: true,
        });
    });

    it("withholds verify without a named target", async () => {
        const c = createService();

        await c.service.pickStatusBarAction();

        expect(c.picker.pickDeploymentStatusAction).toHaveBeenCalledWith({
            targetName: undefined,
            canVerify: false,
        });
    });

    it("withholds verify for a Camunda 8 target", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(
            new DeploymentTarget("cloud", "c8", "https://c8.example.com", "", "none", "", ""),
        );

        await c.service.pickStatusBarAction();

        expect(c.picker.pickDeploymentStatusAction).toHaveBeenCalledWith({
            targetName: "cloud",
            canVerify: false,
        });
    });
});

describe("DeploymentStatusService.refresh", () => {
    it("ignores requests from an inactive editor", async () => {
        const c = createService();
        await c.service.refresh("background");
        expect(c.statusBar.showDeploymentTarget).not.toHaveBeenCalled();
        expect(c.statusBar.hideDeploymentTarget).not.toHaveBeenCalled();
    });

    it.each(["resolve", "reject"])("ignores a stale lookup that later %s", async (outcome) => {
        const c = createService();
        const pending = deferred<DeploymentTarget | undefined>();
        c.deploymentTargetService.getActiveTarget.mockReturnValueOnce(pending.promise);
        const oldRefresh = c.service.refresh("editor-1");
        c.editorStore.getActiveEditorId.mockReturnValue("editor-2");
        await c.service.refresh("editor-2");
        c.statusBar.showDeploymentTarget.mockClear();
        if (outcome === "resolve") pending.resolve(target("old"));
        else pending.reject(new Error("stale error"));
        await oldRefresh;
        expect(c.statusBar.showDeploymentTarget).not.toHaveBeenCalled();
        expect(c.statusBar.hideDeploymentTarget).not.toHaveBeenCalled();
    });

    it("invalidates pending refreshes when hidden, even if the active pointer is unchanged", async () => {
        const c = createService();
        const pending = deferred<DeploymentTarget | undefined>();
        c.deploymentTargetService.getActiveTarget.mockReturnValueOnce(pending.promise);
        const refresh = c.service.refresh("editor-1");
        c.service.hide();
        pending.resolve(target("old"));
        await refresh;
        expect(c.statusBar.showDeploymentTarget).not.toHaveBeenCalled();
    });

    it.each<{ invalidation: string; invalidate: (c: ServiceContext) => void; outcome: string }>([
        { invalidation: "hidden", invalidate: (c) => c.service.hide(), outcome: "resolves" },
        { invalidation: "hidden", invalidate: (c) => c.service.hide(), outcome: "fails" },
        {
            invalidation: "switched to another editor",
            invalidate: (c) => c.editorStore.getActiveEditorId.mockReturnValue("editor-2"),
            outcome: "resolves",
        },
        {
            invalidation: "switched to another editor",
            invalidate: (c) => c.editorStore.getActiveEditorId.mockReturnValue("editor-2"),
            outcome: "fails",
        },
    ])(
        "drops a refresh whose .env read $outcome after the item was $invalidation",
        async ({ invalidate, outcome }) => {
            const c = createService();
            const dotEnvRead = deferred<string>();
            c.workspace.readFile.mockReturnValueOnce(dotEnvRead.promise);
            c.deploymentTargetService.getActiveTarget.mockResolvedValue(endpointRefTarget());

            const staleRefresh = c.service.refresh("editor-1");
            await vi.waitFor(() => expect(c.workspace.readFile).toHaveBeenCalledWith("/work/.env"));
            invalidate(c);
            c.statusBar.hideDeploymentTarget.mockClear();
            if (outcome === "resolves") dotEnvRead.resolve(dotEnvContent(PROD_DOT_ENV));
            else dotEnvRead.reject(new Error("EISDIR: illegal operation"));
            await staleRefresh;

            expect(c.deploymentState.getDeployedRevision).not.toHaveBeenCalled();
            expect(c.statusBar.showDeploymentTarget).not.toHaveBeenCalled();
            expect(c.statusBar.hideDeploymentTarget).not.toHaveBeenCalled();
        },
    );

    it("only publishes the newest lookup for the same editor", async () => {
        const c = createService();
        const pending = deferred<DeploymentTarget | undefined>();
        c.deploymentTargetService.getActiveTarget.mockReturnValueOnce(pending.promise);
        const old = c.service.refresh("editor-1");
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("new"));
        await c.service.refresh("editor-1");
        pending.resolve(target("old"));
        await old;
        expect(c.statusBar.showDeploymentTarget).toHaveBeenCalledExactlyOnceWith(
            "new",
            "unknown",
            undefined,
            undefined,
        );
    });

    it("renders unknown when no revision is recorded", async () => {
        const c = createService();

        await c.service.refresh("editor-1");

        expect(c.statusBar.showDeploymentTarget).toHaveBeenCalledWith(
            undefined,
            "unknown",
            undefined,
            undefined,
        );
    });

    it("renders deployed (green) when content matches the recorded fingerprint", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));
        c.deploymentState.getDeployedRevision.mockReturnValue({
            fingerprint: contentFingerprint("<a/>"),
            deployedAt: "2026-09-17T14:32:00.000Z",
        });

        await c.service.refresh("editor-1");

        expect(c.deploymentState.getDeployedRevision).toHaveBeenCalledWith(
            ledgerKeyFor(DeploymentTargetIdentity.fromTarget(target("dev"), noEnv), FILE_PATH),
        );
        expect(c.statusBar.showDeploymentTarget).toHaveBeenCalledWith(
            "dev",
            "deployed",
            "2026-09-17T14:32:00.000Z",
            undefined,
        );
    });

    it("reads the ledger under the fingerprinted host the endpoint ref resolves to", async () => {
        const c = createService(PROD_DOT_ENV);
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(endpointRefTarget());

        await c.service.refresh("editor-1");

        expect(c.deploymentTargetService.locateTargetsFile).toHaveBeenCalledWith("/work");
        expect(c.workspace.readFile).toHaveBeenCalledWith("/work/.env");
        const ledgerKey = readLedgerKey(c);
        expect(ledgerKey).toContain("env:");
        expect(ledgerKey).not.toContain(PROD_HOST);
        expect(ledgerKey).toBe(
            ledgerKeyFor(
                DeploymentTargetIdentity.fromTarget(endpointRefTarget(), lookupOf(PROD_DOT_ENV)),
                FILE_PATH,
            ),
        );
    });

    it.each(UNREADABLE_DOT_ENVS)(
        "still renders an endpoint-ref target when .env is %s",
        async (_desc, breakDotEnv) => {
            const c = createService(PROD_DOT_ENV);
            breakDotEnv(c);
            c.deploymentTargetService.getActiveTarget.mockResolvedValue(endpointRefTarget());

            await c.service.refresh("editor-1");

            expect(c.deploymentState.getDeployedRevision).toHaveBeenCalledWith(
                ledgerKeyFor(
                    DeploymentTargetIdentity.fromTarget(endpointRefTarget(), NO_ENV_VARIABLES),
                    FILE_PATH,
                ),
            );
            expect(c.statusBar.showDeploymentTarget).toHaveBeenCalledWith(
                "dev",
                "unknown",
                undefined,
                undefined,
            );
            expect(c.statusBar.hideDeploymentTarget).not.toHaveBeenCalled();
            expect(c.notifier.logDebug).toHaveBeenCalledWith(expect.stringContaining(".env"));
        },
    );

    it("reads the ledger of a literal endpoint without touching .env", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));

        await c.service.refresh("editor-1");

        expect(c.deploymentState.getDeployedRevision).toHaveBeenCalledWith(
            `target:dev@localhost:8080::${FILE_PATH}`,
        );
        expect(c.workspace.isSymbolicLink).not.toHaveBeenCalled();
        expect(c.workspace.readFile).not.toHaveBeenCalled();
    });

    it.each(UNREADABLE_DOT_ENVS)(
        "renders a target whose only refs are in its credentials without touching .env when it is %s",
        async (_desc, breakDotEnv) => {
            const c = createService();
            breakDotEnv(c);
            c.deploymentTargetService.getActiveTarget.mockResolvedValue(credentialRefTarget());

            await c.service.refresh("editor-1");

            expect(readLedgerKey(c)).toBe(`target:dev@localhost:8080::${FILE_PATH}`);
            expect(c.statusBar.showDeploymentTarget).toHaveBeenCalledExactlyOnceWith(
                "dev",
                "unknown",
                undefined,
                undefined,
            );
            expectNoDotEnvIo(c);
            expect(c.notifier.logDebug).not.toHaveBeenCalled();
        },
    );

    it("renders changed (yellow) when content differs from the recorded fingerprint", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));
        c.documentPort.getContent.mockReturnValue("<b/>");
        c.deploymentState.getDeployedRevision.mockReturnValue({
            fingerprint: contentFingerprint("<a/>"),
            deployedAt: "2026-09-17T14:32:00.000Z",
        });

        await c.service.refresh("editor-1");

        expect(c.statusBar.showDeploymentTarget).toHaveBeenCalledWith(
            "dev",
            "changed",
            "2026-09-17T14:32:00.000Z",
            undefined,
        );
    });

    it("renders superseded (blue) and passes verifiedAt for an engine-origin mismatch", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(target("dev"));
        c.documentPort.getContent.mockReturnValue("<b/>");
        c.deploymentState.getDeployedRevision.mockReturnValue({
            fingerprint: contentFingerprint("<a/>"),
            deployedAt: "2026-09-17T14:40:00.000Z",
            origin: "engine",
            verifiedAt: "2026-09-17T15:00:00.000Z",
        });

        await c.service.refresh("editor-1");

        expect(c.statusBar.showDeploymentTarget).toHaveBeenCalledWith(
            "dev",
            "superseded",
            "2026-09-17T14:40:00.000Z",
            "2026-09-17T15:00:00.000Z",
        );
    });

    it("hides the item when the editor has no resolvable document", async () => {
        const c = createService();
        c.documentPort.getFilePath.mockImplementation(() => {
            throw new Error("no active editor");
        });

        await c.service.refresh("editor-1");

        expect(c.statusBar.hideDeploymentTarget).toHaveBeenCalled();
    });
});

describe("DeploymentStatusService.refresh in ad-hoc mode", () => {
    it("keys a literal endpoint and tenant without any .env IO", async () => {
        const c = createService();
        useAdHocConnection(c, LITERAL_ENDPOINT, "acme");

        await c.service.refresh("editor-1");

        expect(readLedgerKey(c)).toBe(`adhoc:localhost:8080/acme::${FILE_PATH}`);
        expect(c.deploymentTargetService.locateTargetsFile).not.toHaveBeenCalled();
        expect(c.workspace.isSymbolicLink).not.toHaveBeenCalled();
        expect(c.workspace.readFile).not.toHaveBeenCalled();
    });

    it("reads .env when only the tenant holds a ref and fingerprints the resolved tenant", async () => {
        const dotEnv = { MIRAGON_TENANT: "acme" };
        const c = createService(dotEnv);
        useAdHocConnection(c, LITERAL_ENDPOINT, "${env:MIRAGON_TENANT}");

        await c.service.refresh("editor-1");

        expect(c.workspace.readFile).toHaveBeenCalledWith("/work/.env");
        const ledgerKey = readLedgerKey(c);
        expect(ledgerKey).toMatch(/^adhoc:localhost:8080\/env:/);
        expect(ledgerKey).not.toContain("acme");
        expect(ledgerKey).toBe(
            ledgerKeyFor(
                DeploymentTargetIdentity.adHoc(
                    LITERAL_ENDPOINT,
                    "${env:MIRAGON_TENANT}",
                    lookupOf(dotEnv),
                ),
                FILE_PATH,
            ),
        );
    });

    it("fingerprints a resolved endpoint and tenant so neither value is persisted", async () => {
        const dotEnv = { ...PROD_DOT_ENV, MIRAGON_TENANT: "acme" };
        const c = createService(dotEnv);
        useAdHocConnection(c, "${env:MIRAGON_URL}", "${env:MIRAGON_TENANT}");

        await c.service.refresh("editor-1");

        const ledgerKey = readLedgerKey(c);
        expect(ledgerKey).toMatch(/^adhoc:env:[0-9a-f]+\/env:[0-9a-f]+::/);
        expect(ledgerKey).not.toContain(PROD_HOST);
        expect(ledgerKey).not.toContain("acme");
        expect(ledgerKey).toBe(
            ledgerKeyFor(
                DeploymentTargetIdentity.adHoc(
                    "${env:MIRAGON_URL}",
                    "${env:MIRAGON_TENANT}",
                    lookupOf(dotEnv),
                ),
                FILE_PATH,
            ),
        );
    });

    it.each(UNREADABLE_DOT_ENVS)(
        "keys endpoint and tenant refs by their unresolved references when .env is %s",
        async (_desc, breakDotEnv) => {
            const c = createService({ ...PROD_DOT_ENV, MIRAGON_TENANT: "acme" });
            breakDotEnv(c);
            useAdHocConnection(c, "${env:MIRAGON_URL}", "${env:MIRAGON_TENANT}");

            await c.service.refresh("editor-1");

            expect(readLedgerKey(c)).toBe(
                ledgerKeyFor(
                    DeploymentTargetIdentity.adHoc(
                        "${env:MIRAGON_URL}",
                        "${env:MIRAGON_TENANT}",
                        NO_ENV_VARIABLES,
                    ),
                    FILE_PATH,
                ),
            );
            expect(c.statusBar.showDeploymentTarget).toHaveBeenCalledWith(
                undefined,
                "unknown",
                undefined,
                undefined,
            );
            expect(c.notifier.logDebug).toHaveBeenCalledWith(expect.stringContaining(".env"));
        },
    );

    it("resolves refs from the workspace folder's .env, never a nested targets file's", async () => {
        const workspaceDotEnv = { ...PROD_DOT_ENV, MIRAGON_TENANT: "acme" };
        const c = createService();
        useNestedProject(c, {
            "/work/.env": workspaceDotEnv,
            [`${NESTED_PROJECT_DIR}/.env`]: {
                MIRAGON_URL: "https://team.example.com/engine-rest",
                MIRAGON_TENANT: "team",
            },
        });
        useAdHocConnection(c, "${env:MIRAGON_URL}", "${env:MIRAGON_TENANT}");

        await c.service.refresh("editor-1");

        expect(readLedgerKey(c)).toBe(
            ledgerKeyFor(
                DeploymentTargetIdentity.adHoc(
                    "${env:MIRAGON_URL}",
                    "${env:MIRAGON_TENANT}",
                    lookupOf(workspaceDotEnv),
                ),
                `${NESTED_PROJECT_DIR}/order-process.bpmn`,
            ),
        );
        expect(c.workspace.findWorkspaceFolderForDocument).toHaveBeenCalledWith(NESTED_PROJECT_DIR);
        expect(c.deploymentTargetService.locateTargetsFile).not.toHaveBeenCalled();
        expect(c.workspace.readFile).toHaveBeenCalledExactlyOnceWith("/work/.env");
    });

    it("hides the item on a failure other than an unreadable .env", async () => {
        const c = createService();
        useAdHocConnection(c, "${env:MIRAGON_URL}", "");
        c.workspace.findWorkspaceFolderForDocument.mockImplementation(() => {
            throw new Error("workspace folders unavailable");
        });

        await c.service.refresh("editor-1");

        expect(c.deploymentState.getDeployedRevision).not.toHaveBeenCalled();
        expect(c.statusBar.showDeploymentTarget).not.toHaveBeenCalled();
        expect(c.statusBar.hideDeploymentTarget).toHaveBeenCalledOnce();
    });
});
