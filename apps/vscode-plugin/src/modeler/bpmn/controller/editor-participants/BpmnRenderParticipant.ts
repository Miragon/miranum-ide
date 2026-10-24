import { BpmnModelerService } from "@miragon/bpmn-modeler-core";
import { NotifierPort } from "@miragon/bpmn-modeler-core";
import { EditorSessionContext, EditorSessionParticipant } from "@miragon/bpmn-modeler-core";

/**
 * Owns the BPMN render lifecycle: registers the modeler session, re-renders the
 * diagram on document change, and tears the session down on close.
 */
export class BpmnRenderParticipant implements EditorSessionParticipant {
    constructor(
        private readonly bpmnService: BpmnModelerService,
        private readonly notifier: NotifierPort,
    ) {}

    onResolve(session: EditorSessionContext): void {
        this.bpmnService.registerSession(session.editorId);

        session.onDocumentChange((event) => {
            // Global text-change listener: filter to this session's `.bpmn`
            // document so an edit elsewhere never re-renders this diagram.
            if (
                event.hasContentChanges() &&
                event.documentPath().endsWith(".bpmn") &&
                session.editorId === event.documentUriString()
            ) {
                this.notifier.logDebug("OnDidChangeTextDocument -> display");
                this.bpmnService.display(session.editorId, true);
            }
        });

        session.onDispose(() => this.bpmnService.disposeSession(session.editorId));
    }
}
