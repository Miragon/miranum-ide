import { posix } from "path";

import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { BasicAuth, NoAuth } from "../domain/deployment";
import { ENV_VARIABLE_PREFIX } from "../domain/envRef";
import { StartInstanceConfig, StartInstanceResult } from "../domain/startInstance";
import { CamundaEnginePort } from "../domain/ports";
import { FetchHttpClient } from "../infrastructure/FetchHttpClient";
import { AuthHeaderResolver } from "../infrastructure/camunda/AuthHeaderResolver";
import { Camunda7RestClient } from "../infrastructure/camunda/Camunda7RestClient";
import { StartInstanceService } from "./StartInstanceService";
import { DeploymentTargetService } from "./DeploymentTargetService";
import { EnvScope, EnvValueResolver } from "./EnvValueResolver";
import { BpmnDocument } from "../../shared/domain/BpmnDocument";
import {
    DisallowedEnvReferenceError,
    FileNotFound,
    HttpTransportError,
    InvalidDeploymentConfigError,
    UnresolvedEnvVariableError,
} from "../../shared/domain/errors";

/** `.env` variables, or the error reading that `.env` fails with. */
type DotEnvFile = Record<string, string> | Error;

const PROJECT_DIR = "/work";

/** A real {@link EnvValueResolver} whose project `/work` holds `dotEnv`, if any. */
function createEnvResolver(dotEnv?: DotEnvFile) {
    const targetsLocator: Pick<DeploymentTargetService, "locateTargetsFile"> = {
        locateTargetsFile: vi.fn().mockResolvedValue({
            filePath: posix.join(PROJECT_DIR, ".camunda", "deployment-targets.json"),
            exists: true,
            projectDir: PROJECT_DIR,
        }),
    };
    const workspace = {
        findWorkspaceFolderForDocument: vi.fn().mockReturnValue(PROJECT_DIR),
        isSymbolicLink: vi.fn().mockResolvedValue(false),
        readFile: vi.fn(async (filePath: string) => {
            if (dotEnv === undefined || posix.basename(filePath) !== ".env") {
                throw new FileNotFound(filePath);
            }
            if (dotEnv instanceof Error) {
                throw dotEnv;
            }
            return Object.entries(dotEnv)
                .map(([key, value]) => `${key}=${value}`)
                .join("\n");
        }),
    };
    const envResolver = new EnvValueResolver(targetsLocator, workspace as never);
    return {
        envResolver,
        dotEnvReads: workspace.readFile,
        locateTargetsFile: targetsLocator.locateTargetsFile as Mock,
    };
}

/** The production REST stack down to `fetch`, so a failure's message is the shipped one. */
function createRealRestClient(): Camunda7RestClient {
    const httpClient = new FetchHttpClient();
    return new Camunda7RestClient(httpClient, new AuthHeaderResolver(httpClient));
}

function stubFetch(respond: (url: string) => Promise<Response>) {
    const fetchStub = vi.fn(respond);
    vi.stubGlobal("fetch", fetchStub);
    return fetchStub;
}

/** undici refuses a URL with userinfo with a TypeError that quotes the whole URL. */
function rejectCredentialledUrlsLikeUndici() {
    return stubFetch(async (url) => {
        throw new TypeError(
            `Request cannot be constructed from a URL that includes credentials: ${url}`,
        );
    });
}

/** Every argument any notifier method received; errors contribute message, stack and cause. */
function everythingNotified(notifier: Record<string, Mock>): string {
    return Object.values(notifier)
        .flatMap((notify) => notify.mock.calls.flat())
        .map(describeNotified)
        .join("\n");
}

function describeNotified(argument: unknown): string {
    if (argument instanceof Error) {
        const { cause } = argument as { cause?: unknown };
        return [argument.message, argument.stack, describeNotified(cause)].join("\n");
    }
    return String(argument);
}

// A real C7 document so `getProcessDefinitionKey` exercises the production
// `BpmnDocument.extractProcessId` regex against valid XML rather than a stub.
const C7_DOC = BpmnDocument.empty("c7", "7.24.0");

/**
 * Builds the service with structural port doubles. The service only ever calls
 * these methods, so bare `vi.fn()` records cast to the interfaces keep the test
 * free of any `vscode` surface. `ArtifactService` is concrete in production but
 * is doubled here the same way — the cast erases the nominal type.
 * `engineClient` replaces the REST client mock, e.g. with the real stack over a
 * stubbed `fetch`.
 */
function createService(dotEnv?: DotEnvFile, engineClient?: CamundaEnginePort) {
    const { envResolver, dotEnvReads, locateTargetsFile } = createEnvResolver(dotEnv);
    const createLookup = vi.spyOn(envResolver, "createLookup");
    const vsDocument = {
        getFilePath: vi.fn(),
        getContent: vi.fn(),
    };
    const vsWorkspace = {
        readFile: vi.fn(),
    };
    const restClient = {
        startInstance: vi.fn(),
    };
    const notifier = {
        showInfo: vi.fn(),
        logInfo: vi.fn(),
        logError: vi.fn(),
    };
    const picker = {
        pickPayloadFile: vi.fn(),
    };
    const artifactService = {
        getPayloadPaths: vi.fn(),
    };

    const service = new StartInstanceService(
        vsDocument as never,
        vsWorkspace as never,
        (engineClient ?? restClient) as never,
        notifier as never,
        picker as never,
        artifactService as never,
        envResolver,
    );

    return {
        service,
        vsDocument,
        vsWorkspace,
        restClient,
        notifier,
        picker,
        artifactService,
        dotEnvReads,
        locateTargetsFile,
        createLookup,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("StartInstanceService.getProcessDefinitionKey", () => {
    it("returns the process id extracted from the editor's BPMN content", () => {
        const { service, vsDocument } = createService();
        vsDocument.getContent.mockReturnValue(C7_DOC.xml);

        expect(service.getProcessDefinitionKey("editor-1")).toBe("Process_0gjrx3e");
        expect(vsDocument.getContent).toHaveBeenCalledWith("editor-1");
    });

    it("propagates the error when the content has no process element", () => {
        const { service, vsDocument } = createService();
        vsDocument.getContent.mockReturnValue("<bpmn:definitions/>");

        expect(() => service.getProcessDefinitionKey("editor-1")).toThrow();
    });
});

describe("StartInstanceService.selectPayloadFile", () => {
    it("shows an info notice and returns null when no payload files exist", async () => {
        const { service, vsDocument, artifactService, picker, notifier } = createService();
        vsDocument.getFilePath.mockReturnValue("/work/order.bpmn");
        artifactService.getPayloadPaths.mockResolvedValue([]);

        const result = await service.selectPayloadFile("editor-1");

        expect(result).toBeNull();
        expect(notifier.showInfo).toHaveBeenCalledOnce();
        expect(picker.pickPayloadFile).not.toHaveBeenCalled();
    });

    it("walks up from the document directory and delegates selection to the picker", async () => {
        const { service, vsDocument, artifactService, picker } = createService();
        vsDocument.getFilePath.mockReturnValue("/work/sub/order.bpmn");
        const payloads = ["/work/sub/payloads/a.json"];
        artifactService.getPayloadPaths.mockResolvedValue(payloads);
        const picked = { filePath: payloads[0], label: "a.json" };
        picker.pickPayloadFile.mockResolvedValue(picked);

        const result = await service.selectPayloadFile("editor-1");

        expect(result).toBe(picked);
        // Discovery starts from the document's directory, not the file path.
        expect(artifactService.getPayloadPaths).toHaveBeenCalledWith("/work/sub");
        expect(picker.pickPayloadFile).toHaveBeenCalledWith(payloads);
    });

    it("returns null when payloads exist but the user cancels the picker", async () => {
        const { service, vsDocument, artifactService, picker } = createService();
        vsDocument.getFilePath.mockReturnValue("/work/order.bpmn");
        artifactService.getPayloadPaths.mockResolvedValue(["/work/payloads/a.json"]);
        picker.pickPayloadFile.mockResolvedValue(null);

        await expect(service.selectPayloadFile("editor-1")).resolves.toBeNull();
    });
});

describe("StartInstanceService.startInstance", () => {
    it("reads and parses the payload, then forwards a parsed config to the REST client", async () => {
        const { service, vsWorkspace, restClient } = createService();
        vsWorkspace.readFile.mockResolvedValue('{"amount":42}');
        const success = new StartInstanceResult(true, "started", "pi-1");
        restClient.startInstance.mockResolvedValue(success);

        const result = await service.startInstance(
            "Process_0gjrx3e",
            "http://localhost:8080/engine-rest",
            "c7",
            new NoAuth(),
            "/work/payloads/a.json",
            undefined,
            undefined,
            "workspaceFolder",
        );

        expect(result).toBe(success);
        const config = restClient.startInstance.mock.calls[0][0] as StartInstanceConfig;
        expect(config.processDefinitionKey).toBe("Process_0gjrx3e");
        expect(config.payload).toEqual({ amount: 42 });
    });

    it("passes a null payload when no payload path is given and never reads a file", async () => {
        const { service, vsWorkspace, restClient } = createService();
        const success = new StartInstanceResult(true, "started", "pi-1");
        restClient.startInstance.mockResolvedValue(success);

        await service.startInstance(
            "Process_1",
            "http://c/api",
            "c8",
            new NoAuth(),
            "",
            undefined,
            undefined,
            "workspaceFolder",
        );

        const config = restClient.startInstance.mock.calls[0][0] as StartInstanceConfig;
        expect(config.payload).toBeNull();
        expect(vsWorkspace.readFile).not.toHaveBeenCalled();
    });

    it("passes a failed REST result straight through without logging", async () => {
        const { service, restClient, notifier } = createService();
        const failure = new StartInstanceResult(false, "rejected by server");
        restClient.startInstance.mockResolvedValue(failure);

        const result = await service.startInstance(
            "Process_1",
            "http://c/api",
            "c7",
            new NoAuth(),
            "",
            undefined,
            undefined,
            "workspaceFolder",
        );

        expect(result).toBe(failure);
        expect(notifier.logError).not.toHaveBeenCalled();
    });

    it("never throws: a rejected REST call becomes a failed result and is logged", async () => {
        const { service, restClient, notifier } = createService();
        restClient.startInstance.mockRejectedValue(new Error("network down"));

        const result = await service.startInstance(
            "Process_1",
            "http://c/api",
            "c7",
            new NoAuth(),
            "",
            undefined,
            undefined,
            "workspaceFolder",
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe("network down");
        expect(notifier.logError).toHaveBeenCalledOnce();
    });

    it("never throws: malformed payload JSON becomes a failed result and skips the REST call", async () => {
        const { service, vsWorkspace, restClient, notifier } = createService();
        vsWorkspace.readFile.mockResolvedValue("{ not json");

        const result = await service.startInstance(
            "Process_1",
            "http://c/api",
            "c7",
            new NoAuth(),
            "/work/payloads/bad.json",
            undefined,
            undefined,
            "workspaceFolder",
        );

        expect(result.success).toBe(false);
        expect(restClient.startInstance).not.toHaveBeenCalled();
        expect(notifier.logError).toHaveBeenCalledOnce();
    });

    it("resolves prefixed refs in endpoint, auth, and URL before the REST call", async () => {
        const { service, restClient } = createService({
            MIRAGON_STAGE: "prod",
            MIRAGON_TOKEN: "t0ken",
        });
        restClient.startInstance.mockResolvedValue(new StartInstanceResult(true, "started"));
        const auth = new BasicAuth("admin", "${env:MIRAGON_TOKEN}");

        await service.startInstance(
            "Process_1",
            "https://camunda.${env:MIRAGON_STAGE}.example/engine-rest",
            "c7",
            auth,
            "",
            "https://gw.${env:MIRAGON_STAGE}.example/{processDefinitionKey}/start",
            "/work",
            "workspaceFolder",
        );

        const config = restClient.startInstance.mock.calls[0][0] as StartInstanceConfig;
        expect(config.endpoint).toBe("https://camunda.prod.example/engine-rest");
        expect((config.auth as BasicAuth).username).toBe("admin");
        expect((config.auth as BasicAuth).password).toBe("t0ken");
        // Env expands first; {processDefinitionKey} is left for the REST client.
        expect(config.startInstanceUrl).toBe(
            "https://gw.prod.example/{processDefinitionKey}/start",
        );
        expect(auth.password).toBe("${env:MIRAGON_TOKEN}");
    });

    it("logs the resolved start URL's host as a breadcrumb, never its credentials or path", async () => {
        const { service, restClient, notifier } = createService({
            MIRAGON_GATEWAY: "https://admin:s3cret@gw.prod.example:8443",
        });
        restClient.startInstance.mockResolvedValue(new StartInstanceResult(true, "started"));

        await service.startInstance(
            "Process_1",
            "https://camunda.example/engine-rest",
            "c7",
            new NoAuth(),
            "",
            "${env:MIRAGON_GATEWAY}/gateway-path/{processDefinitionKey}/start",
            "/work",
            "workspaceFolder",
        );

        expect(notifier.logInfo).toHaveBeenCalledWith(
            "Instance start requested: Process_1 @ gw.prod.example:8443",
        );
        const logged = notifier.logInfo.mock.calls.flat().join("\n");
        expect(logged).not.toMatch(/admin|s3cret|gateway-path|\$\{env:/);
    });

    it("logs the endpoint's host as the breadcrumb when no start URL is set", async () => {
        const { service, restClient, notifier } = createService();
        restClient.startInstance.mockResolvedValue(new StartInstanceResult(true, "started"));

        await service.startInstance(
            "Process_1",
            "https://camunda.example/engine-rest",
            "c8",
            new NoAuth(),
            "",
            undefined,
            undefined,
            "workspaceFolder",
        );

        expect(notifier.logInfo).toHaveBeenCalledWith(
            "Instance start requested: Process_1 @ camunda.example",
        );
    });

    it("returns a failed result naming the variable when a referenced variable is unset", async () => {
        const { service, restClient } = createService({ MIRAGON_OTHER: "x" });
        restClient.startInstance.mockResolvedValue(new StartInstanceResult(true, "started"));

        const result = await service.startInstance(
            "Process_1",
            "https://camunda.${env:MIRAGON_MISSING_STAGE}/rest",
            "c7",
            new NoAuth(),
            "",
            undefined,
            "/work",
            "workspaceFolder",
        );

        expect(result.success).toBe(false);
        // The .env path is the remedy: it tells the user where to define the variable.
        expect(result.message).toBe(
            new UnresolvedEnvVariableError("MIRAGON_MISSING_STAGE", "endpoint", "/work/.env")
                .message,
        );
        expect(restClient.startInstance).not.toHaveBeenCalled();
    });

    it("refuses a reference to a variable outside the modeler prefix before calling the engine", async () => {
        const { service, restClient, notifier } = createService({
            AWS_SECRET_ACCESS_KEY: "leak",
        });

        const result = await service.startInstance(
            "Process_1",
            "https://camunda.example/rest",
            "c7",
            new BasicAuth("admin", "${env:AWS_SECRET_ACCESS_KEY}"),
            "",
            undefined,
            "/work",
            "workspaceFolder",
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe(
            new DisallowedEnvReferenceError("auth.password", ENV_VARIABLE_PREFIX).message,
        );
        expect(result.message).not.toContain("leak");
        expect(restClient.startInstance).not.toHaveBeenCalled();
        expect(notifier.logInfo).not.toHaveBeenCalled();
    });

    it("sends the exact resolved secret for a whole ref padded with whitespace", async () => {
        const { service, restClient } = createService({ MIRAGON_PW: "s3cret" });
        restClient.startInstance.mockResolvedValue(new StartInstanceResult(true, "started"));

        await service.startInstance(
            "Process_1",
            "https://camunda.example/engine-rest",
            "c7",
            new BasicAuth("admin", " ${env:MIRAGON_PW}  "),
            "",
            undefined,
            "/work",
            "workspaceFolder",
        );

        const config = restClient.startInstance.mock.calls[0][0] as StartInstanceConfig;
        expect((config.auth as BasicAuth).password).toBe("s3cret");
    });

    it("rejects an endpoint whose variable is set to an empty value before calling the engine", async () => {
        const { service, restClient } = createService({ MIRAGON_URL: "" });

        const result = await service.startInstance(
            "Process_1",
            "${env:MIRAGON_URL}",
            "c7",
            new NoAuth(),
            "",
            undefined,
            "/work",
            "workspaceFolder",
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe(new InvalidDeploymentConfigError(["endpoint"]).message);
        expect(restClient.startInstance).not.toHaveBeenCalled();
    });

    it("posts to the convention start route when the override's variable is set to an empty value", async () => {
        const fetchStub = stubFetch(
            async () => new Response(JSON.stringify({ id: "pi-1" }), { status: 200 }),
        );
        const { service, notifier } = createService({ MIRAGON_START: "" }, createRealRestClient());

        const result = await service.startInstance(
            "Process_1",
            "https://camunda.example/engine-rest",
            "c7",
            new NoAuth(),
            "",
            "${env:MIRAGON_START}",
            "/work",
            "workspaceFolder",
        );

        expect(result).toMatchObject({ success: true, processInstanceId: "pi-1" });
        expect(fetchStub).toHaveBeenCalledExactlyOnceWith(
            "https://camunda.example/engine-rest/process-definition/key/Process_1/start",
            expect.anything(),
        );
        expect(notifier.logInfo).toHaveBeenCalledWith(
            "Instance start requested: Process_1 @ camunda.example",
        );
    });

    it("keeps credentials embedded in a resolved endpoint out of the result and every log when the request fails", async () => {
        const credentialledEndpoint = "https://deployer:s3cret@camunda.invalid/engine-rest";
        const rejected = new HttpTransportError(
            "camunda.invalid",
            "the URL must not contain credentials; use the authentication fields",
        );
        const fetchStub = rejectCredentialledUrlsLikeUndici();
        const { service, notifier } = createService(
            { MIRAGON_URL: credentialledEndpoint },
            createRealRestClient(),
        );

        const result = await service.startInstance(
            "Process_1",
            "${env:MIRAGON_URL}",
            "c7",
            new NoAuth(),
            "",
            undefined,
            "/work",
            "workspaceFolder",
        );

        // The rejection really quoted the secret, so its absence below is the redaction.
        expect(fetchStub).toHaveBeenCalledExactlyOnceWith(
            `${credentialledEndpoint}/process-definition/key/Process_1/start`,
            expect.anything(),
        );
        expect(result.success).toBe(false);
        expect(result.message).toBe(rejected.message);
        expect(notifier.logError).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ host: rejected.host, reason: rejected.reason }),
        );
        expect(notifier.logError.mock.calls[0][0]).toBeInstanceOf(HttpTransportError);
        expect(notifier.logInfo).toHaveBeenCalledWith(
            "Instance start requested: Process_1 @ camunda.invalid",
        );
        expect(result.message).not.toContain("s3cret");
        expect(everythingNotified(notifier)).not.toContain("s3cret");
    });

    it("never reads .env when nothing references it, so a broken .env can't fail the start", async () => {
        const { service, restClient, dotEnvReads } = createService(
            new Error("EISDIR: illegal operation on a directory, read"),
        );
        const success = new StartInstanceResult(true, "started", "pi-1");
        restClient.startInstance.mockResolvedValue(success);

        const result = await service.startInstance(
            "Process_1",
            "https://camunda.example/rest",
            "c7",
            new BasicAuth("admin", "secret"),
            "",
            "https://gw.example/{processDefinitionKey}/start",
            "/work",
            "workspaceFolder",
        );

        expect(result).toBe(success);
        expect(dotEnvReads).not.toHaveBeenCalled();
    });
});

describe("StartInstanceService.startInstance .env scope", () => {
    const NESTED_PROJECT_DIR = "/work/team";

    /** Workspace folder `/work` holding a nested project with its own targets file. */
    function createNestedProjectService() {
        const context = createService({ MIRAGON_URL: "https://camunda.example/engine-rest" });
        context.locateTargetsFile.mockResolvedValue({
            filePath: posix.join(NESTED_PROJECT_DIR, ".camunda", "deployment-targets.json"),
            exists: true,
            projectDir: NESTED_PROJECT_DIR,
        });
        context.restClient.startInstance.mockResolvedValue(
            new StartInstanceResult(true, "started"),
        );
        return context;
    }

    const startWithEndpointRef = (service: StartInstanceService, envScope: EnvScope) =>
        service.startInstance(
            "Process_1",
            "${env:MIRAGON_URL}",
            "c7",
            new NoAuth(),
            "",
            undefined,
            NESTED_PROJECT_DIR,
            envScope,
        );

    it("reads the workspace folder's .env for the workspaceFolder scope, never a nested targets file's", async () => {
        const { service, createLookup, locateTargetsFile, dotEnvReads } =
            createNestedProjectService();

        await startWithEndpointRef(service, "workspaceFolder");

        expect(createLookup).toHaveBeenCalledExactlyOnceWith(
            "workspaceFolder",
            NESTED_PROJECT_DIR,
            expect.objectContaining({ endpoint: "${env:MIRAGON_URL}" }),
        );
        expect(locateTargetsFile).not.toHaveBeenCalled();
        expect(dotEnvReads).toHaveBeenCalledExactlyOnceWith("/work/.env");
    });

    it("reads the .env beside the targets file for the targetsFile scope", async () => {
        const { service, restClient, createLookup, locateTargetsFile, dotEnvReads } =
            createNestedProjectService();

        await startWithEndpointRef(service, "targetsFile");

        expect(createLookup).toHaveBeenCalledExactlyOnceWith(
            "targetsFile",
            NESTED_PROJECT_DIR,
            expect.objectContaining({ endpoint: "${env:MIRAGON_URL}" }),
        );
        expect(locateTargetsFile).toHaveBeenCalledExactlyOnceWith(NESTED_PROJECT_DIR);
        expect(dotEnvReads).toHaveBeenCalledExactlyOnceWith("/work/team/.env");
        const config = restClient.startInstance.mock.calls[0][0] as StartInstanceConfig;
        expect(config.endpoint).toBe("https://camunda.example/engine-rest");
    });
});
