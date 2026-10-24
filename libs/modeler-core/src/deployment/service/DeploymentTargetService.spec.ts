import { describe, expect, it, vi } from "vitest";

import { createTestHost, TestHostOptions } from "../../testing";
import { serializeDeploymentTargets, DeploymentTarget } from "../domain/deploymentTarget";
import { DeploymentTargetService } from "./DeploymentTargetService";

const CONFIG_FOLDER = ".camunda";
const FILE_PATH = `/ws/${CONFIG_FOLDER}/deployment-targets.json`;
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
    );
}

function createService(options: TestHostOptions = {}) {
    const host = createTestHost({
        folders: ["/ws"],
        settings: { configFolder: CONFIG_FOLDER },
        answers: { confirmDestructive: true },
        ...options,
    });
    const artifactService = {
        getWorkspaceRoot: vi.fn().mockResolvedValue("/ws"),
        findConfigFile: vi.fn().mockResolvedValue(undefined),
    };

    const service = new DeploymentTargetService(
        artifactService as never,
        host.settings,
        host.workspace,
        host.secrets,
        host.deploymentState,
        host.picker,
        host.notifier,
    );

    return { service, host, artifactService };
}

const slot = (name: string) => `${FILE_PATH}::${name}`;

describe("DeploymentTargetService.listTargets", () => {
    it("reads and parses the nearest existing file", async () => {
        const c = createService({ files: { [FILE_PATH]: fileWith(target("dev")) } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

        const targets = await c.service.listTargets(DOC_DIR);

        expect(targets.map((t) => t.name)).toEqual(["dev"]);
    });

    it("returns [] when no file exists", async () => {
        const c = createService();
        c.artifactService.findConfigFile.mockResolvedValue(undefined);

        expect(await c.service.listTargets(DOC_DIR)).toEqual([]);
    });

    it("reports a parse error and returns []", async () => {
        const c = createService({ files: { [FILE_PATH]: "{ not valid json" } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

        expect(await c.service.listTargets(DOC_DIR)).toEqual([]);
        expect(c.host.notifier.errors).toEqual([
            expect.stringMatching(/^Could not read deployment targets\n/),
        ]);
    });
});

describe("DeploymentTargetService.openTargetsFile", () => {
    it("opens the existing file without rewriting it", async () => {
        const existing = fileWith(target("dev"));
        const c = createService({ files: { [FILE_PATH]: existing } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

        await c.service.openTargetsFile(DOC_DIR);

        expect(c.host.workspace.files).toEqual(new Map([[FILE_PATH, existing]]));
        expect(c.host.notifier.openedDocuments).toEqual([FILE_PATH]);
    });

    it("creates an empty targets file first when none exists", async () => {
        const c = createService();
        c.artifactService.findConfigFile.mockResolvedValue(undefined);

        await c.service.openTargetsFile(DOC_DIR);

        const [[writtenPath, content]] = c.host.workspace.files;
        expect(writtenPath).toMatch(/deployment-targets\.json$/);
        expect(JSON.parse(content)).toEqual({ targets: [] });
        expect(c.host.notifier.openedDocuments).toEqual([writtenPath]);
    });

    it("throws when there is no workspace", async () => {
        const c = createService({ folders: [] });

        await expect(c.service.openTargetsFile(undefined)).rejects.toThrow(/workspace/);
        expect(c.host.notifier.openedDocuments).toEqual([]);
    });
});

describe("DeploymentTargetService.saveTarget", () => {
    async function seedOldTarget(c: ReturnType<typeof createService>) {
        await c.host.secrets.saveBasicAuth("old-user", "old-pass", slot("old"));
        c.host.deploymentState.activeTargetName = "old";
    }

    async function expectOldTargetUntouched(c: ReturnType<typeof createService>) {
        await expect(c.host.secrets.getBasicAuth(slot("old"))).resolves.toEqual({
            username: "old-user",
            password: "old-pass",
        });
        expect(c.host.deploymentState.activeTargetName).toBe("old");
    }

    it.each(["{ broken", JSON.stringify({ targets: [{ name: "broken" }] })])(
        "leaves the file, secrets, and active target untouched after a parse failure: %s",
        async (content) => {
            const c = createService({ files: { [FILE_PATH]: content } });
            c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);
            await seedOldTarget(c);
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
            expect(c.host.workspace.files.get(FILE_PATH)).toBe(content);
            await expect(c.host.secrets.getBasicAuth(slot("new"))).resolves.toBeUndefined();
            await expect(c.host.secrets.getOAuth2(slot("new"))).resolves.toBeUndefined();
            await expectOldTargetUntouched(c);
        },
    );

    it("aborts mutations when the existing file is unreadable", async () => {
        const c = createService({ files: { [FILE_PATH]: fileWith(target("old")) } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);
        vi.spyOn(c.host.workspace, "readFile").mockRejectedValue(new Error("EACCES"));
        await seedOldTarget(c);
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
        expect(c.host.workspace.files.get(FILE_PATH)).toBe(fileWith(target("old")));
        await expectOldTargetUntouched(c);
    });

    it.each([
        { name: "", endpoint: "https://host" },
        { name: "new", endpoint: " " },
    ])("rejects invalid input before writing: %j", async (fields) => {
        const c = createService();
        c.host.deploymentState.activeTargetName = "old";
        await expect(
            c.service.saveTarget(
                { ...fields, engine: "c7", tenantId: "", authType: "basic" },
                { authType: "basic", username: "u", password: "p" },
                undefined,
                DOC_DIR,
            ),
        ).rejects.toThrow();
        expect(c.host.workspace.files.size).toBe(0);
        await expect(c.host.secrets.getBasicAuth(slot(fields.name))).resolves.toBeUndefined();
        expect(c.host.deploymentState.activeTargetName).toBe("old");
    });

    it("writes the upserted file, stores secrets under the slot, and activates", async () => {
        const c = createService({ files: { [FILE_PATH]: fileWith(target("prod")) } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

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

        const written = c.host.workspace.files.get(FILE_PATH);
        expect(written).toContain('"prod"');
        expect(written).toContain('"dev"');
        await expect(c.host.secrets.getBasicAuth(slot("dev"))).resolves.toEqual({
            username: "u",
            password: "p",
        });
        expect(c.host.deploymentState.activeTargetName).toBe("dev");
    });

    it("deletes the previous credential slot on rename", async () => {
        const c = createService({ files: { [FILE_PATH]: fileWith(target("old")) } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);
        await c.host.secrets.saveBasicAuth("u", "p", slot("old"));

        await c.service.saveTarget(
            { name: "new", engine: "c7", endpoint: "http://h", tenantId: "", authType: "none" },
            { authType: "none" },
            "old",
            DOC_DIR,
        );

        await expect(c.host.secrets.getBasicAuth(slot("old"))).resolves.toBeUndefined();
    });

    it("throws when there is no workspace to store the file in", async () => {
        const c = createService({ folders: [] });

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
        const existing = fileWith(target("dev"), target("prod"));
        const c = createService({ files: { [FILE_PATH]: existing } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);
        await c.host.secrets.saveBasicAuth("u", "p", slot("dev"));

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
        expect(c.host.workspace.files.get(FILE_PATH)).toBe(existing);
        await expect(c.host.secrets.getBasicAuth(slot("dev"))).resolves.toEqual({
            username: "u",
            password: "p",
        });
    });
});

describe("DeploymentTargetService.createTarget", () => {
    it("writes the appended file, stores secrets under the slot, and activates", async () => {
        const c = createService({ files: { [FILE_PATH]: fileWith(target("prod")) } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

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

        const written = c.host.workspace.files.get(FILE_PATH);
        expect(written).toContain('"prod"');
        expect(written).toContain('"dev"');
        await expect(c.host.secrets.getBasicAuth(slot("dev"))).resolves.toEqual({
            username: "u",
            password: "p",
        });
        expect(c.host.deploymentState.activeTargetName).toBe("dev");
    });

    it("throws and writes nothing when the name already exists", async () => {
        const existing = fileWith(target("dev"));
        const c = createService({ files: { [FILE_PATH]: existing } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

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
        expect(c.host.workspace.files.get(FILE_PATH)).toBe(existing);
        await expect(c.host.secrets.getBasicAuth(slot("dev"))).resolves.toBeUndefined();
        expect(c.host.deploymentState.activeTargetName).toBe("");
    });
});

it("returns OAuth metadata even when this machine has no credentials", async () => {
    const c = createService({
        files: {
            [FILE_PATH]: fileWith(
                target("shared", {
                    authType: "oauth2",
                    tokenEndpoint: "https://login/token",
                    audience: "api",
                }),
            ),
        },
    });
    c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);
    expect(await c.service.getStoredCredentials("shared", DOC_DIR)).toEqual({
        authType: "oauth2",
        tokenEndpoint: "https://login/token",
        audience: "api",
    });
});

describe("DeploymentTargetService.deleteTarget", () => {
    it("removes the target, deletes its slot, and clears the active target", async () => {
        const c = createService({
            files: { [FILE_PATH]: fileWith(target("dev"), target("prod")) },
        });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);
        c.host.deploymentState.activeTargetName = "dev";
        await c.host.secrets.saveBasicAuth("u", "p", slot("dev"));

        const deleted = await c.service.deleteTarget("dev", DOC_DIR);

        expect(deleted).toBe(true);
        const written = c.host.workspace.files.get(FILE_PATH);
        expect(written).not.toContain('"dev"');
        await expect(c.host.secrets.getBasicAuth(slot("dev"))).resolves.toBeUndefined();
        expect(c.host.deploymentState.activeTargetName).toBe("");
    });

    it("is a no-op when the user cancels the confirm", async () => {
        const existing = fileWith(target("dev"));
        const c = createService({ files: { [FILE_PATH]: existing }, answers: {} });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

        expect(await c.service.deleteTarget("dev", DOC_DIR)).toBe(false);
        expect(c.host.workspace.files.get(FILE_PATH)).toBe(existing);
    });
});

describe("DeploymentTargetService.getActiveTarget", () => {
    it("returns undefined for a dangling active name", async () => {
        const c = createService({ files: { [FILE_PATH]: fileWith(target("dev")) } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);
        c.host.deploymentState.activeTargetName = "gone";

        expect(await c.service.getActiveTarget(DOC_DIR)).toBeUndefined();
    });
});

describe("DeploymentTargetService.switchActiveTarget", () => {
    it("is a no-op on dismissal", async () => {
        const c = createService();
        c.host.deploymentState.activeTargetName = "prod";

        await c.service.switchActiveTarget(DOC_DIR);

        expect(c.host.deploymentState.activeTargetName).toBe("prod");
    });

    it("persists the picked target", async () => {
        const c = createService({
            files: { [FILE_PATH]: fileWith(target("dev")) },
            answers: { deploymentTarget: "dev" },
        });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

        await c.service.switchActiveTarget(DOC_DIR);

        expect(c.host.deploymentState.activeTargetName).toBe("dev");
    });
});

describe("DeploymentTargetService.getStoredCredentials", () => {
    it("resolves oauth2 secrets plus the target's token endpoint and audience", async () => {
        const c = createService({
            files: {
                [FILE_PATH]: fileWith(
                    target("dev", {
                        authType: "oauth2",
                        tokenEndpoint: "https://idp/token",
                        audience: "aud",
                    }),
                ),
            },
        });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);
        await c.host.secrets.saveOAuth2("cid", "sec", slot("dev"));

        await expect(c.service.getStoredCredentials("dev", DOC_DIR)).resolves.toEqual({
            authType: "oauth2",
            clientId: "cid",
            clientSecret: "sec",
            tokenEndpoint: "https://idp/token",
            audience: "aud",
        });
    });

    it("returns a none payload for an unknown target", async () => {
        const c = createService({ files: { [FILE_PATH]: fileWith(target("dev")) } });
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

        await expect(c.service.getStoredCredentials("missing", DOC_DIR)).resolves.toEqual({
            authType: "none",
        });
    });
});

describe("DeploymentTargetService.resolveSlot", () => {
    it("returns undefined for ad-hoc mode", async () => {
        const c = createService();
        expect(await c.service.resolveSlot("", DOC_DIR)).toBeUndefined();
    });

    it("returns the slot for a named target", async () => {
        const c = createService();
        c.artifactService.findConfigFile.mockResolvedValue(FILE_PATH);

        expect(await c.service.resolveSlot("dev", DOC_DIR)).toBe(`${FILE_PATH}::dev`);
    });
});
