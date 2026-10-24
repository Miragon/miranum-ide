import { Command, SyncDocumentCommand } from "@miragon/bpmn-modeler-shared";

import { NotifierPort } from "../../../shared/domain/hostPorts";
import { MessageHandler } from "../../../shared/infrastructure/WebviewMessageRouter";
import { BpmnModelerService } from "../service/BpmnModelerService";

/** `GetBpmnFileCommand` → render the diagram, logging readiness on success. */
export function getBpmnFileHandler(
    bpmnService: BpmnModelerService,
    notifier: NotifierPort,
): MessageHandler {
    return async (_message: Command, editorId: string) => {
        if (await bpmnService.display(editorId)) {
            notifier.logDebug("Bpmn modeler is ready");
        }
    };
}

/** `SyncDocumentCommand` → persist the current XML; ordering lives in {@link dispatchInDocumentOrder}. */
export function syncDocumentHandler(
    bpmnService: BpmnModelerService,
): MessageHandler<SyncDocumentCommand> {
    return async (sync, editorId) => {
        await bpmnService.sync(editorId, sync.content, sync.documentRevision);
    };
}
