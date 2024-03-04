import { inject, singleton } from "tsyringe";

import { SyncDocumentInPort } from "../ports/in";
import { DocumentOutPort, LogMessageOutPort, ShowMessageOutPort } from "../ports/out";

@singleton()
export class SyncDocumentUseCase implements SyncDocumentInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async sync(editorId: string, content: string): Promise<boolean> {
        try {
            if (editorId !== this.documentOutPort.getId()) {
                throw new Error("Editor ID does not match the active editor.");
            }

            return await this.documentOutPort.write(content);
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.showMessageOutPort.error(
                `A problem occurred while trying to display the BPMN file.\n
                ${(error as Error).message}`,
            );
            return false;
        }
    }
}
