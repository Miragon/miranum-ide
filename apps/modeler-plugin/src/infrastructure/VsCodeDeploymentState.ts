import { getContext } from "./extensionContext";

/**
 * Persists and restores deployment form state (endpoint, tenantId) between
 * VS Code sessions using the extension's `workspaceState` storage.
 *
 * Uses `getContext()` to access the `ExtensionContext` that was registered in `main.ts`
 * via `setContext()`.
 */
export class VsCodeDeploymentState {
    private static readonly ENDPOINT_KEY = "bpmn-modeler.deployment.endpoint";

    private static readonly TENANT_ID_KEY = "bpmn-modeler.deployment.tenantId";

    /**
     * Returns the last-used REST endpoint URL.
     *
     * @returns The persisted endpoint, or an empty string if none has been saved.
     */
    getEndpoint(): string {
        return getContext().workspaceState.get<string>(
            VsCodeDeploymentState.ENDPOINT_KEY,
            "",
        );
    }

    /**
     * Returns the last-used tenant ID.
     *
     * @returns The persisted tenant ID, or an empty string if none has been saved.
     */
    getTenantId(): string {
        return getContext().workspaceState.get<string>(
            VsCodeDeploymentState.TENANT_ID_KEY,
            "",
        );
    }

    /**
     * Persists the endpoint and tenantId after a successful deployment so they
     * can be pre-filled on the next use.
     *
     * @param endpoint The REST endpoint URL to persist.
     * @param tenantId The tenant ID to persist.
     */
    async save(endpoint: string, tenantId: string): Promise<void> {
        await getContext().workspaceState.update(
            VsCodeDeploymentState.ENDPOINT_KEY,
            endpoint,
        );
        await getContext().workspaceState.update(
            VsCodeDeploymentState.TENANT_ID_KEY,
            tenantId,
        );
    }
}
