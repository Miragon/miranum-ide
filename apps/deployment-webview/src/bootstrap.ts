import {
    AdditionalFilesQuery,
    Command,
    DeploymentResultQuery,
    DeploymentTargetsQuery,
    FormDefaultsQuery,
    HostApi,
    LogErrorCommand,
    ProcessDefinitionKeyQuery,
    Query,
    RequestFormDefaultsCommand,
    SelectedPayloadFileQuery,
    StartInstanceResultQuery,
    StoredCredentialsQuery,
    TargetSavedQuery,
} from "@miragon/bpmn-modeler-shared";

import { DeploymentForm } from "./app/form";
import { FORM_TEMPLATE } from "./app/formTemplate";
import type { WebviewState } from "./app/host";
import { StartInstanceForm } from "./app/startInstanceForm";

type DeploymentHost = HostApi<WebviewState, Command | Query>;

type DeploymentFormPort = Pick<
    DeploymentForm,
    | "populate"
    | "setAdditionalFiles"
    | "populateCredentials"
    | "setTargets"
    | "showTargetResult"
    | "showResult"
>;

type StartInstanceFormPort = Pick<
    StartInstanceForm,
    "setProcessDefinitionKey" | "setPayloadFile" | "showResult"
>;

/**
 * Renders the deployment and start-instance forms, restores the active tab and
 * requests the defaults. Every host shell ships only `<div id="app">`.
 */
export function bootstrap(host: DeploymentHost): void {
    let form: DeploymentForm;
    let startForm: StartInstanceForm;

    const app = document.getElementById("app");
    if (app) {
        app.innerHTML = FORM_TEMPLATE;
    }

    try {
        form = new DeploymentForm(host);
        startForm = new StartInstanceForm(
            host,
            () => form.getAuthPayload(),
            () => form.getConnectionPayload(),
        );
        form.onExecutionReadinessChange((reason) => startForm.setExecutionBlockedReason(reason));
    } catch (err) {
        console.error("[DeploymentWebview] Failed to initialise forms:", err);
        const e = err instanceof Error ? err : new Error(String(err));
        host.postMessage(
            new LogErrorCommand(`Failed to initialise deployment forms: ${e.message}`, e.stack),
        );
        return;
    }

    initTabs(host);

    window.addEventListener("message", (event: MessageEvent<Query | Command>) => {
        routeHostMessage(event.data, form, startForm);
    });

    host.postMessage(new RequestFormDefaultsCommand());
}

function initTabs(host: DeploymentHost): void {
    const tabBtns = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
    const tabPanels = document.querySelectorAll<HTMLElement>(".tab-panel");

    try {
        const state = host.getState() as Record<string, unknown> | undefined;
        const savedTab = state?.activeTab as string | undefined;
        if (savedTab) {
            activateTab(savedTab, tabBtns, tabPanels);
        }
    } catch {
        // No saved state — default tab is already active.
    }

    for (const btn of tabBtns) {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            if (!tab) return;
            activateTab(tab, tabBtns, tabPanels);
            host.setState({
                ...((host.getState() as Record<string, unknown>) ?? {}),
                activeTab: tab,
            });
        });
    }
}

function activateTab(
    tab: string,
    tabBtns: NodeListOf<HTMLButtonElement>,
    tabPanels: NodeListOf<HTMLElement>,
): void {
    for (const btn of tabBtns) {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    }
    for (const panel of tabPanels) {
        panel.classList.toggle("active", panel.id === `tab-${tab}`);
    }
}

export function routeHostMessage(
    msg: Query | Command,
    form: DeploymentFormPort,
    startForm: StartInstanceFormPort,
): void {
    switch (msg.type) {
        case "FormDefaultsQuery":
            form.populate((msg as FormDefaultsQuery).defaults);
            break;
        case "AdditionalFilesQuery":
            form.setAdditionalFiles((msg as AdditionalFilesQuery).filePaths);
            break;
        case "StoredCredentialsQuery":
            form.populateCredentials(msg as StoredCredentialsQuery);
            break;
        case "DeploymentTargetsQuery":
            form.setTargets(msg as DeploymentTargetsQuery);
            break;
        case "TargetSavedQuery": {
            const saved = msg as TargetSavedQuery;
            form.showTargetResult(saved.success, saved.message);
            break;
        }
        case "DeploymentResultQuery":
            form.showResult(msg as DeploymentResultQuery);
            break;
        case "ProcessDefinitionKeyQuery":
            startForm.setProcessDefinitionKey(
                (msg as ProcessDefinitionKeyQuery).processDefinitionKey,
            );
            break;
        case "SelectedPayloadFileQuery": {
            const payload = msg as SelectedPayloadFileQuery;
            startForm.setPayloadFile(payload.filePath, payload.label);
            break;
        }
        case "StartInstanceResultQuery":
            startForm.showResult(msg as StartInstanceResultQuery);
            break;
        default:
            console.debug("[DeploymentWebview] Unhandled message type:", msg.type);
    }
}
