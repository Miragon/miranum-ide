import type { DefinitionSearchQuery, WorkspaceDefinition } from "@miragon/bpmn-modeler-types";

/**
 * Finds messages, signals, errors and escalations declared in *other* models.
 * The VS Code / IntelliJ webview answers it by asking the host to scan the
 * workspace; an embedding app can answer from its own model store or a server.
 * Without a port the search field is not rendered.
 */
export interface DefinitionSearchPort {
    /**
     * Called while the user types, with `text` trimmed and never empty. Responses
     * for superseded queries are ignored, so implementations need not cancel
     * them; a rejection shows "Search failed".
     */
    search(query: DefinitionSearchQuery): Promise<readonly WorkspaceDefinition[]>;
}
