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

export interface BpmnModelerSetting {
    readonly alignToOrigin: boolean;
}

export class BpmnModelerSettingQuery extends MiranumModelerQuery {
    public readonly setting: BpmnModelerSetting;

    constructor(setting: BpmnModelerSetting) {
        super("BpmnModelerSettingQuery");
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

export class GetDmnFileCommand extends MiranumModelerCommand {
    constructor() {
        super("GetDmnFileCommand");
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

export class GetBpmnModelerSettingCommand extends MiranumModelerCommand {
    constructor() {
        super("GetBpmnModelerSettingCommand");
    }
}

export class SyncDocumentCommand extends MiranumModelerCommand {
    public readonly content: string;

    constructor(content: string) {
        super("SyncDocumentCommand");
        this.content = content;
    }
}

// <================================== Commands ===================================

// =================================== Errors ==================================>
export class NoModelerError extends Error {
    constructor() {
        super("Modeler is not initialized!");
    }
}

// <================================== Errors ===================================

// =================================== Functions ==================================>
/**
 * Create a list of information that will be sent to the backend and get logged.
 * @param errors A list of further information.
 */
export function formatErrors(errors: string[]): string {
    let msg = "";
    if (errors && errors.length > 0) {
        for (const message of errors) {
            msg += `\n- ${message}`;
        }
    }
    return msg;
}

// <================================== Functions ===================================
