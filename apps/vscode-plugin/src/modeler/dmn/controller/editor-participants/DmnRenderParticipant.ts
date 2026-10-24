import { DmnModelerService } from "@miragon/bpmn-modeler-core";
import { NotifierPort } from "@miragon/bpmn-modeler-core";
import { EditorSessionContext, EditorSessionParticipant } from "@miragon/bpmn-modeler-core";

/**
 * Owns the DMN render lifecycle: registers the modeler session, re-renders on
 * document change, and tears the session down on close. The DMN counterpart to
 * {@link BpmnRenderParticipant}, and the only participant a `.dmn` editor needs.
 */
export class DmnRenderParticipant implements EditorSessionParticipant {
    constructor(
        private readonly dmnService: DmnModelerService,
        private readonly notifier: NotifierPort,
    ) {}

    onResolve(session: EditorSessionContext): void {
        this.dmnService.registerSession(session.editorId);

        session.onDocumentChange((event) => {
            if (
                event.hasContentChanges() &&
                event.documentPath().endsWith(".dmn") &&
                session.editorId === event.documentUriString()
            ) {
                this.notifier.logDebug("OnDidChangeTextDocument -> display");
                this.dmnService.display(session.editorId, true);
            }
        });

        session.onDispose(() => this.dmnService.disposeSession(session.editorId));
    }
}
