import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    DisallowedEnvReferenceError,
    EngineInspectionFailedError,
    EnvReferenceError,
    FileNotFound,
    HttpTransportError,
    UnreadableDotEnvError,
    UnresolvedEnvVariableError,
} from "../../shared/domain/errors";
import { AuthConfig, BasicAuth, NoAuth } from "../domain/deployment";
import { contentFingerprint, DeploymentTargetIdentity } from "../domain/deploymentLedger";
import { DeploymentTarget } from "../domain/deploymentTarget";
import { EngineDeploymentSnapshot } from "../domain/deploymentVerification";
import { EnvLookup } from "../domain/envRef";
import { DeploymentVerificationService } from "./DeploymentVerificationService";
import { EnvValueResolver } from "./EnvValueResolver";

function createDotEnvWorkspace(dotEnv: Record<string, string>) {
    return {
        findWorkspaceFolderForDocument: vi.fn().mockReturnValue("/work"),
        isSymbolicLink: vi.fn().mockResolvedValue(false),
        readFile: vi.fn().mockImplementation(async (path: string) => {
            if (path.endsWith(".env")) {
                return Object.entries(dotEnv)
                    .map(([key, value]) => `${key}=${value}`)
                    .join("\n");
            }
            throw new FileNotFound(path);
        }),
    };
}

const lookupOf =
    (dotEnv: Record<string, string>): EnvLookup =>
    (name) =>
        dotEnv[name];

const c7TargetWith = (endpoint: string, tenantId = ""): DeploymentTarget =>
    new DeploymentTarget("dev", "c7", endpoint, tenantId, "none", "", "");

interface EnvFailureCase {
    failure: string;
    target?: DeploymentTarget;
    credentials?: AuthConfig;
    breakDotEnv?: (workspace: ReturnType<typeof createDotEnvWorkspace>) => void;
    error: EnvReferenceError;
}

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
const identity = DeploymentTargetIdentity.fromTarget(c7Target, () => undefined);

const snapshot = (overrides: Partial<EngineDeploymentSnapshot> = {}): EngineDeploymentSnapshot => ({
    processDefinitionId: "order:3:def-1",
    deploymentId: "dep-9",
    resourceName: "order.bpmn",
    xml: XML,
    deploymentTime: "2026-09-17T14:40:00.000Z",
    ...overrides,
});

function createService(dotEnv: Record<string, string> = {}) {
    const workspace = createDotEnvWorkspace(dotEnv);
    const editorStore = {
        getActiveEditorId: vi.fn().mockReturnValue("editor-1"),
    };
    const documentPort = {
        getFilePath: vi.fn().mockReturnValue(FILE_PATH),
        getContent: vi.fn().mockReturnValue(XML),
    };
    const deploymentTargetService = {
        getActiveTarget: vi.fn().mockResolvedValue(c7Target),
        getCredentials: vi.fn().mockResolvedValue(new NoAuth()),
        locateTargetsFile: vi.fn().mockResolvedValue({
            filePath: "/work/.camunda/deployment-targets.json",
            exists: true,
            projectDir: "/work",
        }),
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
    const notifier = {
        showInfo: vi.fn(),
        showError: vi.fn(),
        notifyError: vi.fn(),
        withProgress: vi.fn((_title: string, task: () => Promise<unknown>) => task()),
    };

    const service = new DeploymentVerificationService(
        editorStore as never,
        documentPort as never,
        deploymentTargetService as never,
        deploymentStatusService as never,
        inspection as never,
        notifier as never,
        new EnvValueResolver(deploymentTargetService as never, workspace as never),
    );

    return {
        service,
        editorStore,
        documentPort,
        deploymentTargetService,
        deploymentStatusService,
        inspection,
        notifier,
        workspace,
    };
}

beforeEach(() => vi.clearAllMocks());

describe("DeploymentVerificationService.verifyActive", () => {
    it("reports when no diagram is focused", async () => {
        const c = createService();
        c.editorStore.getActiveEditorId.mockImplementation(() => {
            throw new Error("no active editor");
        });

        await c.service.verifyActive();

        expect(c.notifier.showInfo).toHaveBeenCalledWith(
            "Open a BPMN diagram to verify its deployment.",
        );
        expect(c.inspection.fetchLatestDefinition).not.toHaveBeenCalled();
    });

    it("reports when no named target is active", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(undefined);

        await c.service.verifyActive("/work");

        expect(c.notifier.showInfo).toHaveBeenCalledWith(
            "Select a named Camunda 7 target to verify against.",
        );
        expect(c.inspection.fetchLatestDefinition).not.toHaveBeenCalled();
    });

    it("reports that C8 targets cannot be verified", async () => {
        const c = createService();
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(c8Target);

        await c.service.verifyActive("/work");

        expect(c.notifier.showInfo).toHaveBeenCalledWith(
            "Verification is not available for Camunda 8 targets.",
        );
        expect(c.inspection.fetchLatestDefinition).not.toHaveBeenCalled();
    });

    it("shows an error when the diagram has no process id", async () => {
        const c = createService();
        c.documentPort.getContent.mockReturnValue("<bpmn:definitions/>");

        await c.service.verifyActive("/work");

        expect(c.notifier.showError).toHaveBeenCalledOnce();
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
        expect(c.notifier.showInfo).toHaveBeenCalledWith(
            expect.stringContaining("dev runs your last deployment"),
        );
    });

    it("adopts an engine revision matching this diagram", async () => {
        const c = createService();

        await c.service.verifyActive("/work");

        expect(c.deploymentStatusService.adoptRevision).toHaveBeenCalledWith(
            FILE_PATH,
            identity,
            expect.objectContaining({ origin: "engine", deploymentId: "dep-9" }),
        );
        expect(c.notifier.showInfo).toHaveBeenCalledWith(
            expect.stringContaining("dev runs exactly this diagram"),
        );
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
        expect(c.notifier.showInfo).toHaveBeenCalledWith(
            `The version deployed on dev (deployed ${deployedTime}) differs from your diagram.`,
        );
        expect(c.notifier.showError).not.toHaveBeenCalled();
    });

    it("omits the deployment time when it is unavailable", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockResolvedValue(
            snapshot({ xml: "<different/>", deploymentTime: undefined }),
        );

        await c.service.verifyActive("/work");

        expect(c.notifier.showInfo).toHaveBeenCalledWith(
            "The version deployed on dev differs from your diagram.",
        );
        expect(c.notifier.showError).not.toHaveBeenCalled();
    });

    it("forgets the row when the process is not deployed", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockResolvedValue(undefined);

        await c.service.verifyActive("/work");

        expect(c.deploymentStatusService.forgetRevision).toHaveBeenCalledWith(FILE_PATH, identity);
        expect(c.deploymentStatusService.adoptRevision).not.toHaveBeenCalled();
        expect(c.notifier.showInfo).toHaveBeenCalledWith("Process 'order' is not deployed on dev.");
    });

    it("points at the target credentials on an auth failure, leaving the ledger untouched", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockRejectedValue(
            new EngineInspectionFailedError(401, "Unauthorized"),
        );

        await c.service.verifyActive("/work");

        expect(c.notifier.showError).toHaveBeenCalledWith(
            'Could not verify deployment on "dev" — check the target credentials.',
        );
        expect(c.deploymentStatusService.adoptRevision).not.toHaveBeenCalled();
        expect(c.deploymentStatusService.forgetRevision).not.toHaveBeenCalled();
    });

    it("routes other failures through notifyError, leaving the ledger untouched", async () => {
        const c = createService();
        c.inspection.fetchLatestDefinition.mockRejectedValue(new Error("connection refused"));

        await c.service.verifyActive("/work");

        expect(c.notifier.notifyError).toHaveBeenCalledWith(
            "Could not verify deployment",
            expect.any(Error),
        );
        expect(c.deploymentStatusService.adoptRevision).not.toHaveBeenCalled();
        expect(c.deploymentStatusService.forgetRevision).not.toHaveBeenCalled();
    });

    it("runs the lookup inside a progress bracket naming the target", async () => {
        const c = createService();

        await c.service.verifyActive("/work");

        expect(c.notifier.withProgress).toHaveBeenCalledWith(
            'Verifying on "dev"…',
            expect.any(Function),
        );
    });

    it("reports a transport failure through notifyError without the request URL", async () => {
        const resolvedUrl = "https://camunda.prod/engine-rest";
        const c = createService({ MIRAGON_URL: resolvedUrl });
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(
            c7TargetWith("${env:MIRAGON_URL}"),
        );
        c.inspection.fetchLatestDefinition.mockRejectedValue(
            new HttpTransportError("camunda.prod", "ECONNREFUSED"),
        );

        await c.service.verifyActive("/work");

        expect(c.notifier.showError).not.toHaveBeenCalled();
        expect(c.notifier.notifyError).toHaveBeenCalledExactlyOnceWith(
            "Could not verify deployment",
            expect.any(HttpTransportError),
        );
        const [title, error] = c.notifier.notifyError.mock.calls[0] as [string, Error];
        expect(`${title} ${error.message}`).not.toContain(resolvedUrl);
        expect(`${title} ${error.message}`).not.toContain("/engine-rest");
        expect(c.deploymentStatusService.adoptRevision).not.toHaveBeenCalled();
        expect(c.deploymentStatusService.forgetRevision).not.toHaveBeenCalled();
    });

    it("verifies a literal target with literal credentials without touching .env, even a broken one", async () => {
        const c = createService();
        c.deploymentTargetService.getCredentials.mockResolvedValue(new BasicAuth("admin", "pw"));
        c.workspace.isSymbolicLink.mockResolvedValue(true);
        c.workspace.readFile.mockRejectedValue(
            new Error("EISDIR: illegal operation on a directory"),
        );

        await c.service.verifyActive("/work");

        expect(c.inspection.fetchLatestDefinition).toHaveBeenCalledOnce();
        expect(c.notifier.showError).not.toHaveBeenCalled();
        expect(c.deploymentTargetService.locateTargetsFile).not.toHaveBeenCalled();
        expect(c.workspace.isSymbolicLink).not.toHaveBeenCalled();
        expect(c.workspace.readFile).not.toHaveBeenCalled();
    });

    it.each<[string, DeploymentTarget]>([
        [
            "its deploy and start-instance URLs",
            new DeploymentTarget(
                "dev",
                "c7",
                c7Target.endpoint,
                "",
                "basic",
                "",
                "",
                "${env:MIRAGON_DEPLOY_URL}",
                "${env:MIRAGON_START_URL}",
            ),
        ],
        [
            "the token endpoint left on a basic-auth target",
            new DeploymentTarget(
                "dev",
                "c7",
                c7Target.endpoint,
                "",
                "basic",
                "${env:MIRAGON_IDP}",
                "",
            ),
        ],
    ])(
        "verifies a target whose only refs are in %s without touching even a broken .env",
        async (_location, refOutsideConnectionTarget) => {
            const c = createService();
            c.deploymentTargetService.getActiveTarget.mockResolvedValue(refOutsideConnectionTarget);
            c.deploymentTargetService.getCredentials.mockResolvedValue(
                new BasicAuth("admin", "pw"),
            );
            c.workspace.readFile.mockRejectedValue(
                new Error("EISDIR: illegal operation on a directory"),
            );

            await c.service.verifyActive("/work");

            expect(c.inspection.fetchLatestDefinition).toHaveBeenCalledExactlyOnceWith({
                endpoint: c7Target.endpoint,
                tenantId: "",
                processKey: "order",
                auth: new BasicAuth("admin", "pw"),
            });
            expect(c.notifier.showError).not.toHaveBeenCalled();
            expect(c.notifier.notifyError).not.toHaveBeenCalled();
            expect(c.deploymentTargetService.locateTargetsFile).not.toHaveBeenCalled();
            expect(c.workspace.isSymbolicLink).not.toHaveBeenCalled();
            expect(c.workspace.readFile).not.toHaveBeenCalled();
            expect(c.deploymentStatusService.adoptRevision).toHaveBeenCalledWith(
                FILE_PATH,
                identity,
                expect.objectContaining({ origin: "engine" }),
            );
        },
    );

    it("resolves env refs in endpoint and credentials before the lookup", async () => {
        const dotEnv = { MIRAGON_STAGE: "prod", MIRAGON_PW: "p@ss" };
        const refTarget = new DeploymentTarget(
            "dev",
            "c7",
            "https://camunda.${env:MIRAGON_STAGE}/rest",
            "",
            "basic",
            "",
            "",
        );
        const c = createService(dotEnv);
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(refTarget);
        c.deploymentTargetService.getCredentials.mockResolvedValue(
            new BasicAuth("admin", "${env:MIRAGON_PW}"),
        );

        await c.service.verifyActive("/work");

        expect(c.inspection.fetchLatestDefinition).toHaveBeenCalledWith({
            endpoint: "https://camunda.prod/rest",
            tenantId: "",
            processKey: "order",
            auth: new BasicAuth("admin", "p@ss"),
        });
    });

    it("reads and adopts the ledger row under the fingerprinted identity of a resolved endpoint", async () => {
        const dotEnv = { MIRAGON_STAGE: "prod" };
        const refTarget = c7TargetWith("https://camunda.${env:MIRAGON_STAGE}/rest");
        const c = createService(dotEnv);
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(refTarget);

        await c.service.verifyActive("/work");

        const expectedIdentity = DeploymentTargetIdentity.fromTarget(refTarget, lookupOf(dotEnv));
        const [, recordedIdentity] = c.deploymentStatusService.getRevision.mock.calls[0];
        const [, adoptedIdentity] = c.deploymentStatusService.adoptRevision.mock.calls[0];
        for (const ledgerIdentity of [recordedIdentity, adoptedIdentity]) {
            expect(ledgerIdentity.key()).toBe(expectedIdentity.key());
            expect(ledgerIdentity.key()).toContain("env:");
            expect(ledgerIdentity.key()).not.toContain("camunda.prod");
        }
    });

    it("forgets a missing process under the fingerprinted identity of a resolved endpoint", async () => {
        const dotEnv = { MIRAGON_URL: "https://camunda.prod/rest" };
        const refTarget = c7TargetWith("${env:MIRAGON_URL}");
        const c = createService(dotEnv);
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(refTarget);
        c.inspection.fetchLatestDefinition.mockResolvedValue(undefined);

        await c.service.verifyActive("/work");

        const [, forgottenIdentity] = c.deploymentStatusService.forgetRevision.mock.calls[0];
        expect(forgottenIdentity.key()).toBe(
            DeploymentTargetIdentity.fromTarget(refTarget, lookupOf(dotEnv)).key(),
        );
        expect(forgottenIdentity.key()).not.toContain("camunda.prod");
    });

    it("resolves an env ref in the tenant id before the lookup", async () => {
        const c = createService({ MIRAGON_TENANT: "acme" });
        c.deploymentTargetService.getActiveTarget.mockResolvedValue(
            c7TargetWith("http://localhost:8080/engine-rest", "${env:MIRAGON_TENANT}"),
        );

        await c.service.verifyActive("/work");

        expect(c.inspection.fetchLatestDefinition).toHaveBeenCalledWith(
            expect.objectContaining({ tenantId: "acme" }),
        );
    });

    it("reads .env when only the credentials hold a ref", async () => {
        const c = createService({ MIRAGON_PW: "p@ss" });
        c.deploymentTargetService.getCredentials.mockResolvedValue(
            new BasicAuth("admin", "${env:MIRAGON_PW}"),
        );

        await c.service.verifyActive("/work");

        expect(c.deploymentTargetService.locateTargetsFile).toHaveBeenCalledWith("/work");
        expect(c.workspace.readFile).toHaveBeenCalledWith("/work/.env");
        expect(c.inspection.fetchLatestDefinition).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: c7Target.endpoint,
                auth: new BasicAuth("admin", "p@ss"),
            }),
        );
        expect(c.deploymentStatusService.adoptRevision).toHaveBeenCalledWith(
            FILE_PATH,
            identity,
            expect.anything(),
        );
    });

    it.each<EnvFailureCase>([
        {
            failure: "an unset variable in the credentials",
            credentials: new BasicAuth("admin", "${env:MIRAGON_MISSING_PW}"),
            error: new UnresolvedEnvVariableError(
                "MIRAGON_MISSING_PW",
                "auth.password",
                "/work/.env",
            ),
        },
        {
            failure: "an unset variable in the endpoint",
            target: c7TargetWith("${env:MIRAGON_MISSING_URL}"),
            error: new UnresolvedEnvVariableError("MIRAGON_MISSING_URL", "endpoint", "/work/.env"),
        },
        {
            failure: "an unset variable in the tenant id",
            target: c7TargetWith("http://localhost:8080/engine-rest", "${env:MIRAGON_MISSING_T}"),
            error: new UnresolvedEnvVariableError("MIRAGON_MISSING_T", "tenantId", "/work/.env"),
        },
        {
            failure: "a missing .env",
            credentials: new BasicAuth("admin", "${env:MIRAGON_PW}"),
            breakDotEnv: (workspace) =>
                workspace.readFile.mockRejectedValue(new FileNotFound("/work/.env")),
            error: new UnresolvedEnvVariableError("MIRAGON_PW", "auth.password", "/work/.env"),
        },
        {
            failure: "a foreign variable",
            credentials: new BasicAuth("admin", "${env:GITHUB_TOKEN}"),
            error: new DisallowedEnvReferenceError("auth.password", "MIRAGON_"),
        },
        {
            failure: "a symlinked .env",
            credentials: new BasicAuth("admin", "${env:MIRAGON_PW}"),
            breakDotEnv: (workspace) => workspace.isSymbolicLink.mockResolvedValue(true),
            error: new UnreadableDotEnvError("/work/.env", "symbolic links are not followed"),
        },
        {
            failure: "an unreadable .env",
            credentials: new BasicAuth("admin", "${env:MIRAGON_PW}"),
            breakDotEnv: (workspace) =>
                workspace.readFile.mockRejectedValue(new Error("EISDIR: illegal operation")),
            error: new UnreadableDotEnvError("/work/.env", "EISDIR: illegal operation"),
        },
    ])(
        "shows the env error for $failure and skips the lookup, leaving the ledger untouched",
        async ({ target, credentials, breakDotEnv, error }) => {
            const c = createService({ MIRAGON_PW: "p@ss" });
            c.deploymentTargetService.getActiveTarget.mockResolvedValue(target ?? c7Target);
            c.deploymentTargetService.getCredentials.mockResolvedValue(credentials ?? new NoAuth());
            breakDotEnv?.(c.workspace);

            await c.service.verifyActive("/work");

            expect(c.notifier.showError).toHaveBeenCalledExactlyOnceWith(error.message);
            expect(c.notifier.notifyError).not.toHaveBeenCalled();
            expect(c.inspection.fetchLatestDefinition).not.toHaveBeenCalled();
            expect(c.deploymentStatusService.adoptRevision).not.toHaveBeenCalled();
            expect(c.deploymentStatusService.forgetRevision).not.toHaveBeenCalled();
        },
    );
});
