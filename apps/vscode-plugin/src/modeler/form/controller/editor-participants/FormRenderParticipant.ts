import { FormModelerService } from "@miragon/bpmn-modeler-core";
import { NotifierPort } from "@miragon/bpmn-modeler-core";

import { EditorSessionContext, EditorSessionParticipant } from "@miragon/bpmn-modeler-core";

export class FormRenderParticipant implements EditorSessionParticipant {
    constructor(
        private readonly formService: FormModelerService,
        private readonly notifier: NotifierPort,
    ) {}

    onResolve(session: EditorSessionContext): void {
        this.formService.registerSession(session.editorId);
        session.onDocumentChange((event) => {
            if (
                event.hasContentChanges() &&
                event.documentPath().endsWith(".form") &&
                session.editorId === event.documentUriString()
            ) {
                this.notifier.logDebug("OnDidChangeTextDocument -> display form");
                void this.formService.display(session.editorId, true);
            }
        });
        session.onDispose(() => this.formService.disposeSession(session.editorId));
    }
}
