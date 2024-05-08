import { inject, injectable } from "tsyringe";

import {
    DisplayMessageInPort,
    GetDocumentInPort,
    LogMessageInPort,
    OpenLoggingConsoleInPort,
    ToggleTextEditorInPort,
} from "../ports/in";
import {
    DisplayMessageOutPort,
    DocumentOutPort,
    LogMessageOutPort,
    OpenLoggingConsoleOutPort,
    TextEditorOutPort,
} from "../ports/out";

@injectable()
export class GetDocumentUseCase implements GetDocumentInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
    ) {}

    getPath(): string {
        return this.documentOutPort.getFilePath();
    }
}

@injectable()
export class ToggleTextEditorUseCase implements ToggleTextEditorInPort {
    constructor(
        @inject("GetDocumentInPort")
        private readonly getDocumentInPort: GetDocumentInPort,
        @inject("TextEditorOutPort")
        private readonly textEditorOutPort: TextEditorOutPort,
    ) {}

    toggle(): Promise<boolean> {
        const documentPath = this.getDocumentInPort.getPath();
        return this.textEditorOutPort.toggle(documentPath);
    }
}

@injectable()
export class OpenLoggingConsoleUseCase implements OpenLoggingConsoleInPort {
    constructor(
        @inject("OpenLoggingConsoleOutPort")
        private readonly openLoggingConsoleOutPort: OpenLoggingConsoleOutPort,
    ) {}

    open() {
        this.openLoggingConsoleOutPort.open();
    }
}

@injectable()
export class DisplayMessageUseCase implements DisplayMessageInPort {
    constructor(
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
    ) {}

    info(message: string) {
        this.displayMessageOutPort.info(message);
    }

    error(message: string) {
        this.displayMessageOutPort.error(message);
    }
}

@injectable()
export class LogMessageUseCase implements LogMessageInPort {
    constructor(
        @inject("LogMessageOutPort")
        protected readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    info(message: string): void {
        this.logMessageOutPort.info(message);
    }

    error(error: Error): void {
        this.logMessageOutPort.error(error);
    }
}
