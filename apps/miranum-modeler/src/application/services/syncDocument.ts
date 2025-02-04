import { inject, singleton } from "tsyringe";

import { SyncDocumentInPort } from "../ports/in";
import { DisplayMessageOutPort, DocumentOutPort, LogMessageOutPort } from "../ports/out";

@singleton()
export class SyncDocumentUseCase implements SyncDocumentInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("DisplayMessageOutPort")
        private readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async sync(editorId: string, content: string): Promise<boolean> {
        if (editorId !== this.documentOutPort.getId()) {
            throw new Error("Editor ID does not match the active editor.");
        }

        try {
            return await this.documentOutPort.write(content);
        } catch (error) {
            return this.handleError(error as Error);
        }
    }

    private handleError(error: Error): boolean {
        this.logMessageOutPort.error(error);
        this.displayMessageOutPort.error(
            `A problem occurred while trying to display the BPMN file.\n
            ${(error as Error).message}`,
        );
        return false;
    }
}
