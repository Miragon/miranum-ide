import {
    DisplayFormEditorInPort,
    DisplayFormPreviewInPort,
    SetSettingInPort,
    SyncDocumentInPort,
} from "../ports/in";
import { inject, injectable } from "tsyringe";

import {
    DocumentOutPort,
    FormEditorUiOutPort,
    FormPreviewSettingsOutPort,
    FormPreviewUiOutPort,
} from "../ports/out";

@injectable()
export class DisplayFormEditorUseCase implements DisplayFormEditorInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("FormEditorUiOutPort")
        private readonly formEditorUiOutPort: FormEditorUiOutPort,
    ) {}

    async display(editorId: string): Promise<boolean> {
        if (editorId !== this.formEditorUiOutPort.getId()) {
            throw new Error("(Editor) The `editorID` does not match the active editor.");
        }

        let jsonForm = this.documentOutPort.getContent();

        if (!jsonForm) {
            jsonForm = EMPTY_JSON_FORM;
            await this.documentOutPort.write(jsonForm);
            await this.documentOutPort.save();
        }

        return this.formEditorUiOutPort.display(
            editorId,
            this.documentOutPort.getContent(),
        );
    }
}

@injectable()
export class SyncDocumentUseCase implements SyncDocumentInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
    ) {}

    async sync(editorId: string, content: string): Promise<boolean> {
        if (editorId !== this.documentOutPort.getId()) {
            throw new Error("(Editor) Editor ID does not match the active editor.");
        }

        return this.documentOutPort.write(content);
    }
}

@injectable()
export class DisplayFormPreviewUseCase implements DisplayFormPreviewInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("FormPreviewUiOutPort")
        private readonly formPreviewUiOutPort: FormPreviewUiOutPort,
    ) {}

    async display(): Promise<boolean> {
        let jsonForm = this.documentOutPort.getContent();

        if (!jsonForm) {
            jsonForm = EMPTY_JSON_FORM;
        }

        return this.formPreviewUiOutPort.display(jsonForm);
    }
}

@injectable()
export class SetSettingUseCase implements SetSettingInPort {
    constructor(
        @inject("FormPreviewSettingsOutPort")
        private readonly formPreviewSettingsOutPort: FormPreviewSettingsOutPort,
        @inject("FormPreviewUiOutPort")
        private readonly formPreviewUiOutPort: FormPreviewUiOutPort,
    ) {}

    async setSetting(): Promise<boolean> {
        const renderer = this.formPreviewSettingsOutPort.getRenderer();
        return this.formPreviewUiOutPort.setSetting(renderer);
    }
}

const EMPTY_JSON_FORM = `{
    "schema": {
        "type": "object",
        "properties": {}
    },
    "uischema": {
        "type": "VerticalLayout",
        "elements": []
    }
}`;
