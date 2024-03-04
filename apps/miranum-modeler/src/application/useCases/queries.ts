import { inject, singleton } from "tsyringe";

import {
    GetDocumentInPort,
    LogMessageInPort,
    ShowLoggerInPort,
    ShowMessageInPort,
    ToggleTextEditorInPort,
} from "../ports/in";
import {
    DocumentOutPort,
    LogMessageOutPort,
    ShowLoggerOutPort,
    ShowMessageOutPort,
    TextEditorOutPort,
} from "../ports/out";

@singleton()
export class GetDocumentUseCase implements GetDocumentInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
    ) {}

    get(): string {
        return this.documentOutPort.getFilePath();
    }
}

@singleton()
export class ShowMessageUseCase implements ShowMessageInPort {
    constructor(
        @inject("ShowMessageOutPort")
        protected readonly showMessageOutPort: ShowMessageOutPort,
    ) {}

    info(message: string) {
        this.showMessageOutPort.info(message);
    }

    error(message: string) {
        this.showMessageOutPort.error(message);
    }
}

@singleton()
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

@singleton()
export class ToggleTextEditorUseCase implements ToggleTextEditorInPort {
    constructor(
        @inject("GetDocumentInPort")
        private readonly getDocumentInPort: GetDocumentInPort,
        @inject("TextEditorOutPort")
        private readonly textEditorOutPort: TextEditorOutPort,
    ) {}

    toggle(): Promise<boolean> {
        const documentPath = this.getDocumentInPort.get();
        return this.textEditorOutPort.toggle(documentPath);
    }
}

@singleton()
export class ShowLoggerUseCase implements ShowLoggerInPort {
    constructor(
        @inject("ShowLoggerOutPort")
        private readonly showLoggerOutPort: ShowLoggerOutPort,
    ) {}

    show() {
        this.showLoggerOutPort.show();
    }
}
