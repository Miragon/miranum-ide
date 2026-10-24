import { describe, expect, it, vi } from "vitest";

import {
    BasicAuth,
    DeploymentConfig,
    DeploymentConfigBuilder,
    DeploymentResult,
    NoAuth,
    OAuth2Auth,
} from "../domain/deployment";
import { DeploymentTarget } from "../domain/deploymentTarget";
import { DeploymentService } from "./DeploymentService";
import { BpmnDocument } from "../../shared/domain/BpmnDocument";
import { createTestHost, TestHostOptions } from "../../testing";

// A real, valid C8 document so `detectEngine` exercises the production
// `BpmnDocument.detectPlatform` path instead of a stub.
const C8_XML = BpmnDocument.empty("c8", "8.8.0").xml;

function createService(options: TestHostOptions = {}) {
    const host = createTestHost(options);
    const restClient = {
        deploy: vi.fn(),
        startInstance: vi.fn(),
    };
    const deploymentStatus = {
        recordDeployment: vi.fn().mockResolvedValue(undefined),
    };

    const service = new DeploymentService(
        host.documents,
        host.workspace,
        host.deploymentState,
        restClient as never,
        host.notifier,
        host.picker,
        host.secrets,
        deploymentStatus as never,
    );

    return { service, host, restClient, deploymentStatus };
}

/** A minimal valid config; callers override only the fields a test cares about. */
function buildConfig(
    overrides: Partial<{
        auth: NoAuth | BasicAuth | OAuth2Auth;
        mainFilePath: string;
        additionalFilePaths: string[];
        endpoint: string;
        tenantId: string;
    }> = {},
): DeploymentConfig {
    return new DeploymentConfigBuilder()
        .withDeploymentName("order-process")
        .withEndpoint(overrides.endpoint ?? "http://localhost:8080/engine-rest")
        .withTenantId(overrides.tenantId ?? "")
        .withMainFilePath(overrides.mainFilePath ?? "/work/order-process.bpmn")
        .withAdditionalFilePaths(overrides.additionalFilePaths ?? [])
        .withAuth(overrides.auth ?? new NoAuth())
        .build();
}

describe("DeploymentService.getFormDefaults", () => {
    it("derives the deployment name from the filename and auto-detects the engine", () => {
        const { service, host } = createService();
        const editor = host.openEditor("/work/order-process.bpmn", C8_XML);
        host.deploymentState.endpoint = "https://camunda.example/api";
        host.deploymentState.tenantId = "acme";

        const defaults = service.getFormDefaults(editor.id);

        expect(defaults.deploymentName).toBe("order-process");
        expect(defaults.engine).toBe("c8");
        expect(defaults.endpoint).toBe("https://camunda.example/api");
        expect(defaults.tenantId).toBe("acme");
    });

    it("falls back to the c7 engine when platform detection fails", () => {
        const { service, host } = createService();
        // No platform markers → detectPlatform throws, caught internally.
        const editor = host.openEditor("/work/order-process.bpmn", "<bpmn:definitions/>");

        const defaults = service.getFormDefaults(editor.id);

        // The name is still derived because it is computed before detection.
        expect(defaults.deploymentName).toBe("order-process");
        expect(defaults.engine).toBe("c7");
    });

    it("uses empty defaults when there is no active editor", () => {
        const { service } = createService();

        const defaults = service.getFormDefaults("editor-1");

        expect(defaults.deploymentName).toBe("");
        expect(defaults.engine).toBe("c7");
    });

    it("defaults the endpoint to the local engine-rest URL when none is stored", () => {
        const { service, host } = createService();
        const editor = host.openEditor("/work/p.bpmn", C8_XML);

        const defaults = service.getFormDefaults(editor.id);

        expect(defaults.endpoint).toBe("http://localhost:8080/engine-rest");
    });
});

describe("DeploymentService.getStoredCredentials", () => {
    it("returns basic credentials when basic auth is stored", async () => {
        const { service, host } = createService();
        host.deploymentState.authType = "basic";
        await host.secrets.saveBasicAuth("admin", "secret");

        await expect(service.getStoredCredentials()).resolves.toEqual({
            authType: "basic",
            username: "admin",
            password: "secret",
        });
    });

    it("returns oauth2 credentials plus the stored token endpoint and audience", async () => {
        const { service, host } = createService();
        host.deploymentState.authType = "oauth2";
        host.deploymentState.tokenEndpoint = "https://idp/token";
        host.deploymentState.audience = "zeebe-api";
        await host.secrets.saveOAuth2("cid", "csecret");

        await expect(service.getStoredCredentials()).resolves.toEqual({
            authType: "oauth2",
            clientId: "cid",
            clientSecret: "csecret",
            tokenEndpoint: "https://idp/token",
            audience: "zeebe-api",
        });
    });

    it("returns a none payload when the auth type is basic but no secret exists", async () => {
        const { service, host } = createService();
        host.deploymentState.authType = "basic";

        await expect(service.getStoredCredentials()).resolves.toEqual({ authType: "none" });
    });

    it("returns a none payload when no auth is configured", async () => {
        const { service } = createService();

        await expect(service.getStoredCredentials()).resolves.toEqual({ authType: "none" });
    });
});

describe("DeploymentService.selectAdditionalFiles", () => {
    it("forwards the deployment-resource glob to the picker", async () => {
        const { service, host } = createService({ answers: { workspaceFiles: ["/work/a.form"] } });

        const result = await service.selectAdditionalFiles();

        expect(result).toEqual(["/work/a.form"]);
        expect(host.picker.prompts).toEqual([
            {
                method: "pickWorkspaceFiles",
                args: [
                    {
                        glob: "**/*.{form,json,dmn}",
                        exclude: "**/element-templates/**",
                        placeholder: expect.any(String),
                        limit: 20,
                    },
                ],
            },
        ]);
    });
});

describe("DeploymentService.deploy", () => {
    const MAIN_FILE = { "/work/order-process.bpmn": "<xml/>" };

    it("reads the main and additional files keyed by basename before deploying", async () => {
        const { service, restClient } = createService({
            files: Object.fromEntries(
                ["/work/main.bpmn", "/work/a.form", "/work/b.dmn"].map((p) => [p, `content:${p}`]),
            ),
        });
        restClient.deploy.mockResolvedValue(new DeploymentResult(true, "ok", "dep-1"));

        await service.deploy(
            buildConfig({
                mainFilePath: "/work/main.bpmn",
                additionalFilePaths: ["/work/a.form", "/work/b.dmn"],
            }),
        );

        const fileContents = restClient.deploy.mock.calls[0][1] as Map<string, string>;
        expect([...fileContents.keys()]).toEqual(["main.bpmn", "a.form", "b.dmn"]);
        expect(fileContents.get("a.form")).toBe("content:/work/a.form");
    });

    it("persists the endpoint, tenant and auth type on success", async () => {
        const { service, host, restClient } = createService({ files: MAIN_FILE });
        host.deploymentState.authType = "basic";
        restClient.deploy.mockResolvedValue(new DeploymentResult(true, "ok", "dep-1"));

        await service.deploy(buildConfig({ endpoint: "https://c/api", tenantId: "acme" }));

        expect(host.deploymentState.endpoint).toBe("https://c/api");
        expect(host.deploymentState.tenantId).toBe("acme");
        expect(host.deploymentState.authType).toBe("none");
    });

    it("stores basic-auth credentials on success", async () => {
        const { service, host, restClient } = createService({ files: MAIN_FILE });
        restClient.deploy.mockResolvedValue(new DeploymentResult(true, "ok"));

        await service.deploy(buildConfig({ auth: new BasicAuth("admin", "secret") }));

        expect(host.deploymentState.authType).toBe("basic");
        await expect(host.secrets.getBasicAuth()).resolves.toEqual({
            username: "admin",
            password: "secret",
        });
    });

    it("stores oauth2 credentials and config on success", async () => {
        const { service, host, restClient } = createService({ files: MAIN_FILE });
        restClient.deploy.mockResolvedValue(new DeploymentResult(true, "ok"));

        await service.deploy(
            buildConfig({
                auth: new OAuth2Auth("cid", "csecret", "https://idp/token", "zeebe-api"),
            }),
        );

        await expect(host.secrets.getOAuth2()).resolves.toEqual({
            clientId: "cid",
            clientSecret: "csecret",
        });
        expect(host.deploymentState.tokenEndpoint).toBe("https://idp/token");
        expect(host.deploymentState.audience).toBe("zeebe-api");
    });

    it("persists only credentials under the slot (not legacy state) in target mode", async () => {
        const { service, host, restClient } = createService({ files: MAIN_FILE });
        restClient.deploy.mockResolvedValue(new DeploymentResult(true, "ok"));

        await service.deploy(
            buildConfig({ auth: new BasicAuth("admin", "secret") }),
            "/ws/.camunda/deployment-targets.json::dev",
        );

        await expect(
            host.secrets.getBasicAuth("/ws/.camunda/deployment-targets.json::dev"),
        ).resolves.toEqual({ username: "admin", password: "secret" });
        await expect(host.secrets.getBasicAuth()).resolves.toBeUndefined();
        expect(host.deploymentState.endpoint).toBe("");
        expect(host.deploymentState.tenantId).toBe("");
        expect(host.deploymentState.authType).toBe("none");
    });

    it("passes a failed result through without persisting any state", async () => {
        const { service, host, restClient } = createService({ files: MAIN_FILE });
        restClient.deploy.mockResolvedValue(new DeploymentResult(false, "rejected by server"));

        const result = await service.deploy(buildConfig());

        expect(result.success).toBe(false);
        expect(host.deploymentState.endpoint).toBe("");
    });

    it("never throws: a rejected REST call becomes a failed result and is logged", async () => {
        const { service, host, restClient } = createService({ files: MAIN_FILE });
        restClient.deploy.mockRejectedValue(new Error("network down"));

        const result = await service.deploy(buildConfig());

        expect(result.success).toBe(false);
        expect(result.message).toBe("network down");
        expect(host.notifier.logged("error")).toEqual(["network down"]);
    });

    it("never throws: a failed file read becomes a failed result", async () => {
        const { service, host, restClient } = createService();
        vi.spyOn(host.workspace, "readFile").mockRejectedValue(new Error("ENOENT"));

        const result = await service.deploy(buildConfig());

        expect(result.success).toBe(false);
        expect(result.message).toBe("ENOENT");
        expect(restClient.deploy).not.toHaveBeenCalled();
    });
});

describe("DeploymentService.deployFiles", () => {
    const target = new DeploymentTarget(
        "dev",
        "c7",
        "https://c/api",
        "acme",
        "none",
        "",
        "",
        "https://gw/deploy",
    );

    it("deploys each file named by basename and reports a full-success summary", async () => {
        const { service, host, restClient } = createService({
            files: { "/work/a.bpmn": "<xml/>", "/work/b.dmn": "<xml/>" },
        });
        restClient.deploy.mockResolvedValue(new DeploymentResult(true, "ok"));

        const results = await service.deployFiles(
            ["/work/a.bpmn", "/work/b.dmn"],
            target,
            new NoAuth(),
        );

        expect(results).toHaveLength(2);
        expect(results.every((r) => r.success)).toBe(true);
        const firstConfig = restClient.deploy.mock.calls[0][0] as DeploymentConfig;
        expect(firstConfig.deploymentName).toBe("a");
        expect(firstConfig.endpoint).toBe("https://c/api");
        expect(firstConfig.deployUrl).toBe("https://gw/deploy");
        expect(host.notifier.infos).toEqual(['Deployed 2/2 file(s) to "dev".']);
    });

    it("continues after a per-file failure and reports a partial summary", async () => {
        const { service, host, restClient } = createService({
            files: { "/work/a.bpmn": "<xml/>", "/work/b.bpmn": "<xml/>" },
        });
        restClient.deploy
            .mockResolvedValueOnce(new DeploymentResult(true, "ok"))
            .mockRejectedValueOnce(new Error("boom"));

        const results = await service.deployFiles(
            ["/work/a.bpmn", "/work/b.bpmn"],
            target,
            new NoAuth(),
        );

        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        expect(results[1].message).toContain("boom");
        expect(host.notifier.errors).toEqual(['Deployed 1/2 file(s) to "dev".']);
    });
});
