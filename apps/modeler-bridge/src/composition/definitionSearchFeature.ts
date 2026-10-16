import { Command, SearchWorkspaceDefinitionsCommand } from "@miragon/bpmn-modeler-shared";
import { DefinitionSearchService, WorkspaceDefinitionIndex } from "@miragon/bpmn-modeler-core";

import { BridgeSharedDeps } from "./sharedDeps";
import { SessionHooks } from "./sessionHooks";

/**
 * The definition-search feature owns the {@link WorkspaceDefinitionIndex} and
 * the {@link DefinitionSearchService} that answer the webview's search for
 * messages, signals, errors and escalations of other models.
 *
 * Webview messages: SearchWorkspaceDefinitionsCommand.
 */
export function register(deps: BridgeSharedDeps): { sessionHooks: SessionHooks } {
    const definitionSearchService = new DefinitionSearchService(
        deps.store,
        deps.documentPort,
        deps.nodeWorkspace,
        new WorkspaceDefinitionIndex(deps.nodeWorkspace, deps.notifier),
        deps.notifier,
    );

    deps.router.on(
        "SearchWorkspaceDefinitionsCommand",
        async (message: Command, editorId: string) => {
            await definitionSearchService.search(
                editorId,
                message as SearchWorkspaceDefinitionsCommand,
            );
        },
    );

    return {
        sessionHooks: {
            onSessionDisposed: (editorId) => definitionSearchService.releaseEditor(editorId),
        },
    };
}
