import { Command, Query } from "./messages";

// =================================== Queries ==================================>

export abstract class MiranumModelerQuery implements Query {
    public readonly type: string;

    protected constructor(type: string) {
        this.type = type;
    }
}

export class BpmnFileQuery extends MiranumModelerQuery {
    public readonly content: string;

    public readonly engine: "c7" | "c8";

    constructor(content: string, engine: "c7" | "c8") {
        super("BpmnFileQuery");
        this.content = content;
        this.engine = engine;
    }
}

export class DmnFileQuery extends MiranumModelerQuery {
    public readonly content: string;

    constructor(content: string) {
        super("DmnFileQuery");
        this.content = content;
    }
}

export class FormKeysQuery extends MiranumModelerQuery {
    public readonly formKeys: string[];

    constructor(formKeys: string[]) {
        super("FormKeysQuery");
        this.formKeys = formKeys;
    }
}

export class ElementTemplatesQuery extends MiranumModelerQuery {
    public readonly elementTemplates: JSON[];

    constructor(elementTemplates: string[]) {
        super("ElementTemplatesQuery");
        this.elementTemplates = elementTemplates.map((it) => JSON.parse(it));
    }
}

export interface WebviewSetting {
    readonly alignToOrigin: boolean;
}

export class WebviewSettingQuery extends MiranumModelerQuery {
    public readonly setting: WebviewSetting;

    constructor(setting: WebviewSetting) {
        super("WebviewConfigQuery");
        this.setting = setting;
    }
}

// <================================== Queries ===================================
//
// =================================== Commands ==================================>

export abstract class MiranumModelerCommand implements Command {
    public readonly type: string;

    protected constructor(type: string) {
        this.type = type;
    }
}

export class GetBpmnFileCommand extends MiranumModelerCommand {
    constructor() {
        super("GetBpmnFileCommand");
    }
}

export class GetFormKeysCommand extends MiranumModelerCommand {
    constructor() {
        super("GetFormKeysCommand");
    }
}

export class GetElementTemplatesCommand extends MiranumModelerCommand {
    constructor() {
        super("GetElementTemplatesCommand");
    }
}

export class GetWebviewSettingCommand extends MiranumModelerCommand {
    constructor() {
        super("GetWebviewSettingCommand");
    }
}

export class SyncDocumentCommand extends MiranumModelerCommand {
    public readonly content: string;

    constructor(content: string) {
        super("SyncDocumentCommand");
        this.content = content;
    }
}

// export class AlignElementsToOriginCommand extends MiranumModelerCommand {
//     constructor() {
//         super("AlignElementsToOriginCommand");
//     }
// }

// <================================== Commands ===================================
