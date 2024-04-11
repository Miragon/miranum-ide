import {
    DisplayFormBuilderInPort,
    DisplayFormPreviewInPort,
    SetSettingInPort,
    SyncDocumentInPort,
} from "../ports/in";
import { inject, singleton } from "tsyringe";

import {
    DisplayMessageOutPort,
    DocumentOutPort,
    FormBuilderUiOutPort,
    FormPreviewSettingsOutPort,
    FormPreviewUiOutPort,
    LogMessageOutPort,
} from "../ports/out";
import { NoChangesToApplyError } from "@miranum-ide/vscode/miranum-vscode";

@singleton()
export class DisplayFormBuilderUseCase implements DisplayFormBuilderInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("FormBuilderUiOutPort")
        private readonly formBuilderUiOutPort: FormBuilderUiOutPort,
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async display(editorId: string): Promise<boolean> {
        if (editorId !== this.formBuilderUiOutPort.getId()) {
            return this.handleError(
                new Error("The `editorID` does not match the active editor."),
            );
        }

        try {
            return await this.formBuilderUiOutPort.display(
                editorId,
                this.documentOutPort.getContent(),
            );
        } catch (error) {
            return this.handleError(error as Error);
        }
    }

    private handleError(error: Error): boolean {
        this.logMessageOutPort.error(error as Error);
        this.displayMessageOutPort.error(
            `A problem occurred while trying to display the JsonForm Builder.\n${
                (error as Error).message ?? error
            }`,
        );
        return false;
    }
}

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
            this.logMessageOutPort.error(error as Error);
            if (!(error instanceof NoChangesToApplyError)) {
                this.displayMessageOutPort.error(
                    `A problem occurred while trying to write to the document. ${(error as Error).message}`,
                );
            }
            return false;
        }
    }
}

@singleton()
export class DisplayFormPreviewUseCase implements DisplayFormPreviewInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("FormPreviewSettingsOutPort")
        private readonly formPreviewSettingsOutPort: FormPreviewSettingsOutPort,
        @inject("FormPreviewUiOutPort")
        private readonly formPreviewUiOutPort: FormPreviewUiOutPort,
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async display(): Promise<boolean> {
        try {
            const jsonForm = this.documentOutPort.getContent();
            const renderer = this.formPreviewSettingsOutPort.getRenderer();

            return await this.formPreviewUiOutPort.display(jsonForm, renderer);
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.displayMessageOutPort.error(
                `A problem occurred while trying to display the JsonForm Preview.\n${
                    (error as Error).message ?? error
                }`,
            );
            return false;
        }
    }
}

@singleton()
export class SetSettingUseCase implements SetSettingInPort {
    constructor(
        @inject("FormPreviewSettingsOutPort")
        private readonly formPreviewSettingsOutPort: FormPreviewSettingsOutPort,
        @inject("FormPreviewUiOutPort")
        private readonly formPreviewUiOutPort: FormPreviewUiOutPort,
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async setSetting(): Promise<boolean> {
        try {
            const renderer = this.formPreviewSettingsOutPort.getRenderer();

            return await this.formPreviewUiOutPort.setSetting(renderer);
        } catch (error) {
            this.logMessageOutPort.error(error as Error);
            this.displayMessageOutPort.error(
                `A problem occurred while trying to set the renderer.\n${
                    (error as Error).message ?? error
                }`,
            );
            return false;
        }
    }
}
