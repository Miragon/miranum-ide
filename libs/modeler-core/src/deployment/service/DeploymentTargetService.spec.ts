import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthConfigPayload, DeploymentTargetPayload } from "@miragon/bpmn-modeler-shared";

import { DisallowedEnvReferenceError } from "../../shared/domain/errors";
import { CredentialRefs } from "../domain/credentialRefs";
import { BasicAuth, NoAuth, OAuth2Auth } from "../domain/deployment";
import { serializeDeploymentTargets, DeploymentTarget } from "../domain/deploymentTarget";
import { DeploymentTargetService } from "./DeploymentTargetService";

const CONFIG_FOLDER = ".camunda";
const TARGETS_FILE_NAME = "deployment-targets.json";
const WORKSPACE_ROOT = "/ws";
const FILE_PATH = `${WORKSPACE_ROOT}/${CONFIG_FOLDER}/${TARGETS_FILE_NAME}`;
const DOC_DIR = "/ws/src";

function fileWith(...targets: DeploymentTarget[]): string {
    return serializeDeploymentTargets(targets);
}

function target(name: string, overrides: Partial<DeploymentTarget> = {}): DeploymentTarget {
    return new DeploymentTarget(
        name,
        overrides.engine ?? "c7",
        overrides.endpoint ?? "http://localhost:8080/engine-rest",
        overrides.tenantId ?? "",
        overrides.authType ?? "none",
        overrides.tokenEndpoint ?? "",
        overrides.audience ?? "",
        overrides.deployUrl,
        overrides.startInstanceUrl,
        overrides.credentialRefs,
    );
}

interface DisallowedFieldCase {
    target: Partial<DeploymentTargetPayload>;
    auth?: AuthConfigPayload;
    field: string;
}

interface LeakedSecretCase {
    description: string;
    field: string;
    auth: AuthConfigPayload;
}

function writtenTarget(c: ReturnType<typeof createService>, name: string) {
    const written = JSON.parse(c.workspace.writeFile.mock.calls[0][1] as string);
    return written.targets.find((entry: { name: string }) => entry.name === name);
}

function createService() {
    const artifactService = {
        getWorkspaceRoot: vi.fn().mockResolvedValue(WORKSPACE_ROOT),
        findConfigBaseDir: vi.fn().mockResolvedValue(undefined),
    };
    const settings = { getConfigFolder: vi.fn().mockReturnValue(CONFIG_FOLDER) };
    const workspace = {
        readFile: vi.fn(),
        writeFile: vi.fn().mockResolvedValue(undefined),
        getWorkspaceFolderPaths: vi.fn().mockReturnValue([WORKSPACE_ROOT]),
    };
    const secretStore = {
        saveBasicAuth: vi.fn().mockResolvedValue(undefined),
        getBasicAuth: vi.fn(),
        saveOAuth2: vi.fn().mockResolvedValue(undefined),
        getOAuth2: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
    };
    const deploymentState = {
        getActiveTargetName: vi.fn().mockReturnValue(""),
        saveActiveTargetName: vi.fn().mockResolvedValue(undefined),
    };
    const picker = {
        pickDeploymentTarget: vi.fn(),
        confirmDestructive: vi.fn().mockResolvedValue(true),
    };
    const notifier = {
        notifyError: vi.fn(),
        logError: vi.fn(),
        openDocument: vi.fn().mockResolvedValue(undefined),
    };

    const service = new DeploymentTargetService(
        artifactService as never,
        settings as never,
        workspace as never,
        secretStore as never,
        deploymentState as never,
        picker as never,
        notifier as never,
    );

    return {
        service,
        artifactService,
        workspace,
        secretStore,
        deploymentState,
        picker,
        notifier,
    };
}

beforeEach(() => vi.clearAllMocks());

describe("DeploymentTargetService.locateTargetsFile", () => {
    it("searches from the document directory up to its workspace root", async () => {
        const c = createService();

        await c.service.locateTargetsFile(DOC_DIR);

        expect(c.artifactService.getWorkspaceRoot).toHaveBeenCalledWith(DOC_DIR);
        expect(c.artifactService.findConfigBaseDir).toHaveBeenCalledWith(
            DOC_DIR,
            CONFIG_FOLDER,
            TARGETS_FILE_NAME,
            WORKSPACE_ROOT,
        );
    });

    it("points a missing file at the workspace root, which is also the project dir", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(undefined);

        await expect(c.service.locateTargetsFile(DOC_DIR)).resolves.toEqual({
            filePath: FILE_PATH,
            exists: false,
            projectDir: WORKSPACE_ROOT,
        });
    });

    it("uses the directory owning a nested targets file as the project dir", async () => {
        const c = createService();
        const ownerDir = "/ws/services/order";
        c.artifactService.findConfigBaseDir.mockResolvedValue(ownerDir);

        await expect(c.service.locateTargetsFile(`${ownerDir}/src`)).resolves.toEqual({
            filePath: `${ownerDir}/${CONFIG_FOLDER}/${TARGETS_FILE_NAME}`,
            exists: true,
            projectDir: ownerDir,
        });
    });

    it("searches the first workspace folder when no document directory is given", async () => {
        const c = createService();
        c.workspace.getWorkspaceFolderPaths.mockReturnValue([WORKSPACE_ROOT, "/other"]);
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);

        await expect(c.service.locateTargetsFile(undefined)).resolves.toEqual({
            filePath: FILE_PATH,
            exists: true,
            projectDir: WORKSPACE_ROOT,
        });
        expect(c.artifactService.getWorkspaceRoot).not.toHaveBeenCalled();
        expect(c.artifactService.findConfigBaseDir).toHaveBeenCalledWith(
            WORKSPACE_ROOT,
            CONFIG_FOLDER,
            TARGETS_FILE_NAME,
            WORKSPACE_ROOT,
        );
    });

    it("returns undefined without a workspace or document directory", async () => {
        const c = createService();
        c.workspace.getWorkspaceFolderPaths.mockReturnValue([]);

        await expect(c.service.locateTargetsFile(undefined)).resolves.toBeUndefined();
        expect(c.artifactService.findConfigBaseDir).not.toHaveBeenCalled();
    });

    it("reads and keys secrets from the nested file it found", async () => {
        const c = createService();
        const ownerDir = "/ws/services/order";
        const nestedFile = `${ownerDir}/${CONFIG_FOLDER}/${TARGETS_FILE_NAME}`;
        c.artifactService.findConfigBaseDir.mockResolvedValue(ownerDir);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev", { authType: "basic" })));
        c.secretStore.getBasicAuth.mockResolvedValue({ username: "u", password: "p" });

        await c.service.getStoredCredentials("dev", `${ownerDir}/src`);

        expect(c.workspace.readFile).toHaveBeenCalledWith(nestedFile);
        expect(c.secretStore.getBasicAuth).toHaveBeenCalledWith(`${nestedFile}::dev`);
    });
});

describe("DeploymentTargetService.listTargets", () => {
    it("reads and parses the nearest existing file", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev")));

        const targets = await c.service.listTargets(DOC_DIR);

        expect(c.workspace.readFile).toHaveBeenCalledWith(FILE_PATH);
        expect(targets.map((t) => t.name)).toEqual(["dev"]);
    });

    it("returns [] when no file exists", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(undefined);

        expect(await c.service.listTargets(DOC_DIR)).toEqual([]);
    });

    it("reports a parse error and returns []", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue("{ not valid json");

        expect(await c.service.listTargets(DOC_DIR)).toEqual([]);
        expect(c.notifier.notifyError).toHaveBeenCalledOnce();
    });
});

describe("DeploymentTargetService.openTargetsFile", () => {
    it("opens the existing file without rewriting it", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);

        await c.service.openTargetsFile(DOC_DIR);

        expect(c.workspace.writeFile).not.toHaveBeenCalled();
        expect(c.notifier.openDocument).toHaveBeenCalledWith(FILE_PATH);
    });

    it("creates an empty targets file first when none exists", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(undefined);

        await c.service.openTargetsFile(DOC_DIR);

        const [writtenPath, content] = c.workspace.writeFile.mock.calls[0];
        expect(writtenPath).toMatch(/deployment-targets\.json$/);
        expect(JSON.parse(content)).toEqual({ targets: [] });
        expect(c.notifier.openDocument).toHaveBeenCalledWith(writtenPath);
    });

    it("throws when there is no workspace", async () => {
        const c = createService();
        c.workspace.getWorkspaceFolderPaths.mockReturnValue([]);

        await expect(c.service.openTargetsFile(undefined)).rejects.toThrow(/workspace/);
        expect(c.notifier.openDocument).not.toHaveBeenCalled();
    });
});

describe("DeploymentTargetService.saveTarget", () => {
    it.each(["{ broken", JSON.stringify({ targets: [{ name: "broken" }] })])(
        "leaves the file, secrets, and active target untouched after a parse failure: %s",
        async (content) => {
            const c = createService();
            c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
            c.workspace.readFile.mockResolvedValue(content);
            await expect(
                c.service.saveTarget(
                    {
                        name: "new",
                        engine: "c7",
                        endpoint: "https://host",
                        tenantId: "",
                        authType: "none",
                    },
                    { authType: "none" },
                    undefined,
                    DOC_DIR,
                ),
            ).rejects.toThrow();
            await expect(c.service.deleteTarget("old", DOC_DIR)).rejects.toThrow();
            expect(c.workspace.writeFile).not.toHaveBeenCalled();
            expect(c.secretStore.saveBasicAuth).not.toHaveBeenCalled();
            expect(c.secretStore.saveOAuth2).not.toHaveBeenCalled();
            expect(c.secretStore.delete).not.toHaveBeenCalled();
            expect(c.deploymentState.saveActiveTargetName).not.toHaveBeenCalled();
        },
    );

    it("aborts mutations when the existing file is unreadable", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockRejectedValue(new Error("EACCES"));
        await expect(
            c.service.saveTarget(
                {
                    name: "new",
                    engine: "c7",
                    endpoint: "https://host",
                    tenantId: "",
                    authType: "none",
                },
                { authType: "none" },
                undefined,
                DOC_DIR,
            ),
        ).rejects.toThrow("EACCES");
        await expect(c.service.deleteTarget("old", DOC_DIR)).rejects.toThrow("EACCES");
        expect(c.workspace.writeFile).not.toHaveBeenCalled();
        expect(c.secretStore.delete).not.toHaveBeenCalled();
        expect(c.deploymentState.saveActiveTargetName).not.toHaveBeenCalled();
    });

    it.each([
        { name: "", endpoint: "https://host" },
        { name: "new", endpoint: " " },
    ])("rejects invalid input before writing: %j", async (fields) => {
        const c = createService();
        await expect(
            c.service.saveTarget(
                { ...fields, engine: "c7", tenantId: "", authType: "basic" },
                { authType: "basic", username: "u", password: "p" },
                undefined,
                DOC_DIR,
            ),
        ).rejects.toThrow();
        expect(c.workspace.writeFile).not.toHaveBeenCalled();
        expect(c.secretStore.saveBasicAuth).not.toHaveBeenCalled();
        expect(c.deploymentState.saveActiveTargetName).not.toHaveBeenCalled();
    });

    it("writes the upserted file, stores secrets under the slot, and activates", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("prod")));

        await c.service.saveTarget(
            {
                name: "dev",
                engine: "c7",
                endpoint: "http://h",
                tenantId: "",
                authType: "basic",
            },
            { authType: "basic", username: "u", password: "p" },
            undefined,
            DOC_DIR,
        );

        const written = c.workspace.writeFile.mock.calls[0][1] as string;
        expect(written).toContain('"prod"');
        expect(written).toContain('"dev"');
        expect(c.secretStore.saveBasicAuth).toHaveBeenCalledWith("u", "p", `${FILE_PATH}::dev`);
        expect(c.deploymentState.saveActiveTargetName).toHaveBeenCalledWith("dev");
    });

    it.each(["${env:MIRAGON_CAMUNDA_PASSWORD}", "  ${env:MIRAGON_CAMUNDA_PASSWORD} "])(
        "writes a whole-value credential ref to the JSON trimmed and stores it as typed: %j",
        async (password) => {
            const c = createService();
            c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
            c.workspace.readFile.mockResolvedValue(fileWith());

            await c.service.saveTarget(
                {
                    name: "dev",
                    engine: "c7",
                    endpoint: "http://h",
                    tenantId: "",
                    authType: "basic",
                },
                { authType: "basic", username: "admin", password },
                undefined,
                DOC_DIR,
            );

            expect(writtenTarget(c, "dev").auth).toEqual({
                type: "basic",
                password: "${env:MIRAGON_CAMUNDA_PASSWORD}",
            });
            expect(c.secretStore.saveBasicAuth).toHaveBeenCalledExactlyOnceWith(
                "admin",
                password,
                `${FILE_PATH}::dev`,
            );
        },
    );

    it("stores a ref username and its literal password together, never an empty half", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith());

        await c.service.saveTarget(
            { name: "dev", engine: "c7", endpoint: "http://h", tenantId: "", authType: "basic" },
            { authType: "basic", username: "${env:MIRAGON_USER}", password: "s3cret" },
            undefined,
            DOC_DIR,
        );

        expect(writtenTarget(c, "dev").auth).toEqual({
            type: "basic",
            username: "${env:MIRAGON_USER}",
        });
        // A backend that reads an empty half back as null would drop the literal beside it.
        expect(c.secretStore.saveBasicAuth).toHaveBeenCalledExactlyOnceWith(
            "${env:MIRAGON_USER}",
            "s3cret",
            `${FILE_PATH}::dev`,
        );
    });

    it("writes oauth2 client credential refs to the JSON and stores them as typed", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith());
        const oauth = { tokenEndpoint: "https://idp/token", audience: "api" };

        await c.service.saveTarget(
            {
                name: "dev",
                engine: "c8",
                endpoint: "http://h",
                tenantId: "",
                authType: "oauth2",
                ...oauth,
            },
            {
                authType: "oauth2",
                clientId: "${env:MIRAGON_CLIENT_ID}",
                clientSecret: "${env:MIRAGON_CLIENT_SECRET}",
                ...oauth,
            },
            undefined,
            DOC_DIR,
        );

        expect(writtenTarget(c, "dev").auth).toEqual({
            type: "oauth2",
            ...oauth,
            clientId: "${env:MIRAGON_CLIENT_ID}",
            clientSecret: "${env:MIRAGON_CLIENT_SECRET}",
        });
        expect(c.secretStore.saveOAuth2).toHaveBeenCalledExactlyOnceWith(
            "${env:MIRAGON_CLIENT_ID}",
            "${env:MIRAGON_CLIENT_SECRET}",
            `${FILE_PATH}::dev`,
        );
    });

    it.each(["plain-secret", "prefix-${env:MIRAGON_CAMUNDA_PASSWORD}"])(
        "keeps a literal or partial credential out of the JSON and in the secret store: %j",
        async (password) => {
            const c = createService();
            c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
            c.workspace.readFile.mockResolvedValue(fileWith());

            await c.service.saveTarget(
                {
                    name: "dev",
                    engine: "c7",
                    endpoint: "http://h",
                    tenantId: "",
                    authType: "basic",
                },
                { authType: "basic", username: "admin", password },
                undefined,
                DOC_DIR,
            );

            expect(writtenTarget(c, "dev").auth).toEqual({ type: "basic" });
            expect(c.secretStore.saveBasicAuth).toHaveBeenCalledWith(
                "admin",
                password,
                `${FILE_PATH}::dev`,
            );
        },
    );

    it.each([
        { authType: "basic", password: "${env:GITHUB_TOKEN}", field: "auth.password" },
        { authType: "oauth2", clientSecret: "${env:GITHUB_TOKEN}", field: "auth.clientSecret" },
    ] as const)(
        "rejects a foreign credential ref in $field and writes nothing",
        async ({ field, ...auth }) => {
            const c = createService();
            c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
            c.workspace.readFile.mockResolvedValue(fileWith());

            const saving = c.service.saveTarget(
                {
                    name: "dev",
                    engine: "c7",
                    endpoint: "http://h",
                    tenantId: "",
                    authType: auth.authType,
                },
                auth,
                undefined,
                DOC_DIR,
            );

            await expect(saving).rejects.toBeInstanceOf(DisallowedEnvReferenceError);
            await expect(saving).rejects.toMatchObject({ field });
            expect(c.workspace.writeFile).not.toHaveBeenCalled();
            expect(c.secretStore.saveBasicAuth).not.toHaveBeenCalled();
            expect(c.secretStore.saveOAuth2).not.toHaveBeenCalled();
            expect(c.deploymentState.saveActiveTargetName).not.toHaveBeenCalled();
        },
    );

    it.each<DisallowedFieldCase>([
        { target: { endpoint: "https://${env:HOST}/engine-rest" }, field: "endpoint" },
        { target: { tenantId: "${env:MIRAGON_TENANT" }, field: "tenantId" },
        {
            target: { authType: "oauth2", tokenEndpoint: "https://${env:AWS_REGION}/token" },
            auth: { authType: "oauth2", tokenEndpoint: "https://${env:AWS_REGION}/token" },
            field: "auth.tokenEndpoint",
        },
        {
            target: { authType: "oauth2", audience: "${env:miragon_audience}" },
            auth: { authType: "oauth2", audience: "${env:miragon_audience}" },
            field: "auth.audience",
        },
        { target: { deployUrl: "http://h/${env:PATH}/deploy" }, field: "endpoints.deploy" },
        {
            target: { startInstanceUrl: "http://h/${env:}/start" },
            field: "endpoints.startInstance",
        },
    ])(
        "rejects a foreign or malformed ref in $field and writes nothing",
        async ({ target: overrides, auth = { authType: "none" }, field }) => {
            const c = createService();
            c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
            c.workspace.readFile.mockResolvedValue(fileWith());

            const saving = c.service.saveTarget(
                {
                    name: "dev",
                    engine: "c7",
                    endpoint: "http://h",
                    tenantId: "",
                    authType: "none",
                    ...overrides,
                },
                auth,
                undefined,
                DOC_DIR,
            );

            await expect(saving).rejects.toBeInstanceOf(DisallowedEnvReferenceError);
            await expect(saving).rejects.toMatchObject({ field });
            expect(c.workspace.writeFile).not.toHaveBeenCalled();
            expect(c.secretStore.saveBasicAuth).not.toHaveBeenCalled();
            expect(c.secretStore.saveOAuth2).not.toHaveBeenCalled();
            expect(c.deploymentState.saveActiveTargetName).not.toHaveBeenCalled();
        },
    );

    it.each<LeakedSecretCase>([
        {
            description: "an unclosed ref",
            field: "auth.password",
            auth: { authType: "basic", username: "admin", password: "p${env:hunter2rest" },
        },
        {
            description: "a ref name with a space",
            field: "auth.clientSecret",
            auth: { authType: "oauth2", clientId: "cid", clientSecret: "${env:hunter 2}" },
        },
        {
            description: "a well-formed foreign ref",
            field: "auth.password",
            auth: { authType: "basic", username: "admin", password: "p${env:hunter2}rest" },
        },
    ])("never echoes $field holding $description and writes nothing", async ({ field, auth }) => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith());

        const saving = c.service.saveTarget(
            {
                name: "dev",
                engine: "c7",
                endpoint: "http://h",
                tenantId: "",
                authType: auth.authType,
            },
            auth,
            undefined,
            DOC_DIR,
        );

        await expect(saving).rejects.toBeInstanceOf(DisallowedEnvReferenceError);
        await expect(saving).rejects.toMatchObject({
            field,
            message: expect.not.stringContaining("hunter"),
        });
        expect(c.workspace.writeFile).not.toHaveBeenCalled();
        expect(c.secretStore.saveBasicAuth).not.toHaveBeenCalled();
        expect(c.secretStore.saveOAuth2).not.toHaveBeenCalled();
    });

    it("deletes the previous credential slot on rename", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("old")));

        await c.service.saveTarget(
            { name: "new", engine: "c7", endpoint: "http://h", tenantId: "", authType: "none" },
            { authType: "none" },
            "old",
            DOC_DIR,
        );

        expect(c.secretStore.delete).toHaveBeenCalledWith(`${FILE_PATH}::old`);
    });

    it("throws when there is no workspace to store the file in", async () => {
        const c = createService();
        c.workspace.getWorkspaceFolderPaths.mockReturnValue([]);

        await expect(
            c.service.saveTarget(
                {
                    name: "dev",
                    engine: "c7",
                    endpoint: "http://h",
                    tenantId: "",
                    authType: "none",
                },
                { authType: "none" },
                undefined,
                undefined,
            ),
        ).rejects.toThrow(/workspace/);
    });

    it("throws and leaves the file untouched on a rename collision", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev"), target("prod")));

        await expect(
            c.service.saveTarget(
                {
                    name: "prod",
                    engine: "c7",
                    endpoint: "http://h",
                    tenantId: "",
                    authType: "none",
                },
                { authType: "none" },
                "dev",
                DOC_DIR,
            ),
        ).rejects.toThrow(/already exists/);
        expect(c.workspace.writeFile).not.toHaveBeenCalled();
        expect(c.secretStore.delete).not.toHaveBeenCalled();
    });
});

describe("DeploymentTargetService.createTarget", () => {
    it("writes the appended file, stores secrets under the slot, and activates", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("prod")));

        await c.service.createTarget(
            {
                name: "dev",
                engine: "c7",
                endpoint: "http://h",
                tenantId: "",
                authType: "basic",
            },
            { authType: "basic", username: "u", password: "p" },
            DOC_DIR,
        );

        const written = c.workspace.writeFile.mock.calls[0][1] as string;
        expect(written).toContain('"prod"');
        expect(written).toContain('"dev"');
        expect(c.secretStore.saveBasicAuth).toHaveBeenCalledWith("u", "p", `${FILE_PATH}::dev`);
        expect(c.deploymentState.saveActiveTargetName).toHaveBeenCalledWith("dev");
    });

    it("throws and writes nothing when the name already exists", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev")));

        await expect(
            c.service.createTarget(
                {
                    name: "dev",
                    engine: "c7",
                    endpoint: "http://h",
                    tenantId: "",
                    authType: "basic",
                },
                { authType: "basic", username: "u", password: "p" },
                DOC_DIR,
            ),
        ).rejects.toThrow(/already exists/);
        expect(c.workspace.writeFile).not.toHaveBeenCalled();
        expect(c.secretStore.saveBasicAuth).not.toHaveBeenCalled();
        expect(c.deploymentState.saveActiveTargetName).not.toHaveBeenCalled();
    });

    it("writes a padded whole-value credential ref to the JSON trimmed and stores it as typed", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith());

        await c.service.createTarget(
            { name: "dev", engine: "c7", endpoint: "http://h", tenantId: "", authType: "basic" },
            { authType: "basic", username: " ${env:MIRAGON_USER}", password: "p" },
            DOC_DIR,
        );

        expect(writtenTarget(c, "dev").auth).toEqual({
            type: "basic",
            username: "${env:MIRAGON_USER}",
        });
        expect(c.secretStore.saveBasicAuth).toHaveBeenCalledExactlyOnceWith(
            " ${env:MIRAGON_USER}",
            "p",
            `${FILE_PATH}::dev`,
        );
    });

    it("rejects a foreign credential ref and writes nothing", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith());

        const creating = c.service.createTarget(
            { name: "dev", engine: "c7", endpoint: "http://h", tenantId: "", authType: "basic" },
            { authType: "basic", username: "admin", password: "${env:GITHUB_TOKEN}" },
            DOC_DIR,
        );

        await expect(creating).rejects.toBeInstanceOf(DisallowedEnvReferenceError);
        await expect(creating).rejects.toMatchObject({ field: "auth.password" });
        expect(c.workspace.writeFile).not.toHaveBeenCalled();
        expect(c.secretStore.saveBasicAuth).not.toHaveBeenCalled();
        expect(c.deploymentState.saveActiveTargetName).not.toHaveBeenCalled();
    });
});

it("returns OAuth metadata even when this machine has no credentials", async () => {
    const c = createService();
    c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
    c.workspace.readFile.mockResolvedValue(
        fileWith(
            target("shared", {
                authType: "oauth2",
                tokenEndpoint: "https://login/token",
                audience: "api",
            }),
        ),
    );
    expect(await c.service.getStoredCredentials("shared", DOC_DIR)).toEqual({
        authType: "oauth2",
        tokenEndpoint: "https://login/token",
        audience: "api",
    });
});

describe("DeploymentTargetService.deleteTarget", () => {
    it("removes the target, deletes its slot, and clears the active target", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev"), target("prod")));
        c.deploymentState.getActiveTargetName.mockReturnValue("dev");

        const deleted = await c.service.deleteTarget("dev", DOC_DIR);

        expect(deleted).toBe(true);
        const written = c.workspace.writeFile.mock.calls[0][1] as string;
        expect(written).not.toContain('"dev"');
        expect(c.secretStore.delete).toHaveBeenCalledWith(`${FILE_PATH}::dev`);
        expect(c.deploymentState.saveActiveTargetName).toHaveBeenCalledWith("");
    });

    it("is a no-op when the user cancels the confirm", async () => {
        const c = createService();
        c.picker.confirmDestructive.mockResolvedValue(false);

        expect(await c.service.deleteTarget("dev", DOC_DIR)).toBe(false);
        expect(c.workspace.writeFile).not.toHaveBeenCalled();
    });
});

describe("DeploymentTargetService.getActiveTarget", () => {
    it("returns undefined for a dangling active name", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev")));
        c.deploymentState.getActiveTargetName.mockReturnValue("gone");

        expect(await c.service.getActiveTarget(DOC_DIR)).toBeUndefined();
    });
});

describe("DeploymentTargetService.switchActiveTarget", () => {
    it("is a no-op on dismissal", async () => {
        const c = createService();
        c.picker.pickDeploymentTarget.mockResolvedValue(undefined);

        await c.service.switchActiveTarget(DOC_DIR);

        expect(c.deploymentState.saveActiveTargetName).not.toHaveBeenCalled();
    });

    it("persists the picked target", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev")));
        c.picker.pickDeploymentTarget.mockResolvedValue("dev");

        await c.service.switchActiveTarget(DOC_DIR);

        expect(c.deploymentState.saveActiveTargetName).toHaveBeenCalledWith("dev");
    });
});

describe("DeploymentTargetService.getStoredCredentials", () => {
    it("resolves oauth2 secrets plus the target's token endpoint and audience", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(
            fileWith(
                target("dev", {
                    authType: "oauth2",
                    tokenEndpoint: "https://idp/token",
                    audience: "aud",
                }),
            ),
        );
        c.secretStore.getOAuth2.mockResolvedValue({ clientId: "cid", clientSecret: "sec" });

        await expect(c.service.getStoredCredentials("dev", DOC_DIR)).resolves.toEqual({
            authType: "oauth2",
            clientId: "cid",
            clientSecret: "sec",
            tokenEndpoint: "https://idp/token",
            audience: "aud",
        });
        expect(c.secretStore.getOAuth2).toHaveBeenCalledWith(`${FILE_PATH}::dev`);
    });

    it("drops a ref that a teammate removed from the file even though the store still holds it", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev", { authType: "basic" })));
        c.secretStore.getBasicAuth.mockResolvedValue({
            username: "${env:MIRAGON_USER}",
            password: "s3cret",
        });

        await expect(c.service.getStoredCredentials("dev", DOC_DIR)).resolves.toEqual({
            authType: "basic",
            username: "",
            password: "s3cret",
        });
    });

    it("returns a none payload for an unknown target", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev")));

        await expect(c.service.getStoredCredentials("missing", DOC_DIR)).resolves.toEqual({
            authType: "none",
        });
    });

    it("prefers a file credential ref over the secret store (file wins)", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(
            fileWith(
                target("dev", {
                    authType: "basic",
                    credentialRefs: CredentialRefs.basic(undefined, "${env:MIRAGON_PW}"),
                }),
            ),
        );
        c.secretStore.getBasicAuth.mockResolvedValue({ username: "admin", password: "old-stored" });

        await expect(c.service.getStoredCredentials("dev", DOC_DIR)).resolves.toEqual({
            authType: "basic",
            username: "admin",
            password: "${env:MIRAGON_PW}",
        });
    });

    it("prefers a file credential ref over a stale ref kept in the secret store", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(
            fileWith(
                target("dev", {
                    authType: "basic",
                    credentialRefs: CredentialRefs.basic("${env:MIRAGON_USER}", undefined),
                }),
            ),
        );
        c.secretStore.getBasicAuth.mockResolvedValue({
            username: "${env:MIRAGON_OLD_USER}",
            password: "s3cret",
        });

        await expect(c.service.getStoredCredentials("dev", DOC_DIR)).resolves.toEqual({
            authType: "basic",
            username: "${env:MIRAGON_USER}",
            password: "s3cret",
        });
    });

    it("prefills a saved ref username together with its literal password", async () => {
        const c = createService();
        let targetsFile = fileWith();
        const secrets = new Map<string, { username: string; password: string }>();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockImplementation(async () => targetsFile);
        c.workspace.writeFile.mockImplementation(async (_path: string, content: string) => {
            targetsFile = content;
        });
        c.secretStore.saveBasicAuth.mockImplementation(
            async (username: string, password: string, slot: string) => {
                secrets.set(slot, { username, password });
            },
        );
        c.secretStore.getBasicAuth.mockImplementation(async (slot: string) => secrets.get(slot));

        await c.service.saveTarget(
            { name: "dev", engine: "c7", endpoint: "http://h", tenantId: "", authType: "basic" },
            { authType: "basic", username: "${env:MIRAGON_USER}", password: "s3cret" },
            undefined,
            DOC_DIR,
        );

        await expect(c.service.getStoredCredentials("dev", DOC_DIR)).resolves.toEqual({
            authType: "basic",
            username: "${env:MIRAGON_USER}",
            password: "s3cret",
        });
    });

    it("returns only the auth type when neither the file nor the store has basic credentials", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        c.workspace.readFile.mockResolvedValue(fileWith(target("dev", { authType: "basic" })));
        c.secretStore.getBasicAuth.mockResolvedValue(undefined);

        await expect(c.service.getStoredCredentials("dev", DOC_DIR)).resolves.toEqual({
            authType: "basic",
        });
    });
});

describe("DeploymentTargetService.getCredentials", () => {
    function serviceWithTargetsFile() {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);
        return c;
    }

    it("prefers basic file refs over stored values and falls back to the store per field", async () => {
        const c = serviceWithTargetsFile();
        c.secretStore.getBasicAuth.mockResolvedValue({ username: "admin", password: "old-stored" });
        const refTarget = target("dev", {
            authType: "basic",
            credentialRefs: CredentialRefs.basic(undefined, "${env:MIRAGON_PW}"),
        });

        await expect(c.service.getCredentials(refTarget, DOC_DIR)).resolves.toEqual(
            new BasicAuth("admin", "${env:MIRAGON_PW}"),
        );
        expect(c.secretStore.getBasicAuth).toHaveBeenCalledWith(`${FILE_PATH}::dev`);
    });

    it("prefers oauth2 file refs over stored values and keeps the target's token metadata", async () => {
        const c = serviceWithTargetsFile();
        c.secretStore.getOAuth2.mockResolvedValue({ clientId: "cid", clientSecret: "old-stored" });
        const refTarget = target("dev", {
            authType: "oauth2",
            tokenEndpoint: "https://idp/token",
            audience: "aud",
            credentialRefs: CredentialRefs.oauth2(undefined, "${env:MIRAGON_SECRET}"),
        });

        await expect(c.service.getCredentials(refTarget, DOC_DIR)).resolves.toEqual(
            new OAuth2Auth("cid", "${env:MIRAGON_SECRET}", "https://idp/token", "aud"),
        );
    });

    it("uses the stored literals of a target without refs", async () => {
        const c = serviceWithTargetsFile();
        c.secretStore.getBasicAuth.mockResolvedValue({ username: "u", password: "p" });

        await expect(
            c.service.getCredentials(target("dev", { authType: "basic" }), DOC_DIR),
        ).resolves.toEqual(new BasicAuth("u", "p"));
    });

    it.each(["basic", "oauth2"] as const)(
        "falls back to no auth when a %s target has neither refs nor stored credentials",
        async (authType) => {
            const c = serviceWithTargetsFile();
            c.secretStore.getBasicAuth.mockResolvedValue(undefined);
            c.secretStore.getOAuth2.mockResolvedValue(undefined);

            await expect(
                c.service.getCredentials(target("dev", { authType }), DOC_DIR),
            ).resolves.toBeInstanceOf(NoAuth);
        },
    );

    it("returns no auth for a none target without consulting the store", async () => {
        const c = serviceWithTargetsFile();

        await expect(c.service.getCredentials(target("dev"), DOC_DIR)).resolves.toBeInstanceOf(
            NoAuth,
        );
        expect(c.secretStore.getBasicAuth).not.toHaveBeenCalled();
        expect(c.secretStore.getOAuth2).not.toHaveBeenCalled();
    });
});

describe("DeploymentTargetService.resolveSlot", () => {
    it("returns undefined for ad-hoc mode", async () => {
        const c = createService();
        expect(await c.service.resolveSlot("", DOC_DIR)).toBeUndefined();
    });

    it("returns the slot for a named target", async () => {
        const c = createService();
        c.artifactService.findConfigBaseDir.mockResolvedValue(WORKSPACE_ROOT);

        expect(await c.service.resolveSlot("dev", DOC_DIR)).toBe(`${FILE_PATH}::dev`);
    });
});
