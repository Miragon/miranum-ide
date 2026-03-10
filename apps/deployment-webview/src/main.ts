import "./styles/default.css";

import {
    AdditionalFilesQuery,
    Command,
    DeploymentResultQuery,
    FormDefaultsQuery,
    Query,
    RequestFormDefaultsCommand,
} from "@bpmn-modeler/shared";

import { DeploymentForm } from "./app/form";
import { getVsCodeApi } from "./app/vscode";

const vscode = getVsCodeApi();

/**
 * Entry point: initialises the deployment form once the DOM is ready and
 * requests initial form defaults from the extension host.
 */
window.onload = function () {
    let form: DeploymentForm;

    try {
        form = new DeploymentForm(vscode);
    } catch (err) {
        console.error("[DeploymentWebview] Failed to initialise form:", err);
        return;
    }

    window.addEventListener("message", (event: MessageEvent<Query | Command>) => {
        onReceiveMessage(event, form);
    });

    // Request pre-populated defaults from the extension host.
    vscode.postMessage(new RequestFormDefaultsCommand());
};

/**
 * Routes messages from the VS Code extension host to the appropriate form method.
 *
 * @param event The raw `MessageEvent` from `window.addEventListener("message", …)`.
 * @param form The active {@link DeploymentForm} instance.
 */
function onReceiveMessage(
    event: MessageEvent<Query | Command>,
    form: DeploymentForm,
): void {
    const msg = event.data;

    switch (msg.type) {
        case "FormDefaultsQuery":
            form.populate((msg as FormDefaultsQuery).defaults);
            break;
        case "AdditionalFilesQuery":
            form.setAdditionalFiles((msg as AdditionalFilesQuery).filePaths);
            break;
        case "DeploymentResultQuery":
            form.showResult(msg as DeploymentResultQuery);
            break;
        default:
            console.debug("[DeploymentWebview] Unhandled message type:", msg.type);
    }
}
