import { Command, Query } from "./messages";

// =================================== Queries ==================================>
export class BpmnFileQuery extends Query {
    public readonly content: string;

    public readonly engine: "c7" | "c8";

    constructor(content: string, engine: "c7" | "c8") {
        super("BpmnFileQuery");
        this.content = content;
        this.engine = engine;
    }
}

export class DmnFileQuery extends Query {
    public readonly content: string;

    constructor(content: string) {
        super("DmnFileQuery");
        this.content = content;
    }
}

export class FormKeysQuery extends Query {
    public readonly formKeys: string[];

    constructor(formKeys: string[]) {
        super("FormKeysQuery");
        this.formKeys = formKeys;
    }
}

export class ElementTemplatesQuery extends Query {
    public readonly elementTemplates: JSON[];

    constructor(elementTemplates: string[]) {
        super("ElementTemplatesQuery");
        this.elementTemplates = elementTemplates.map((it) => JSON.parse(it)).flat();
    }
}

export interface BpmnModelerSetting {
    readonly alignToOrigin: boolean;
}

export class BpmnModelerSettingQuery extends Query {
    public readonly setting: BpmnModelerSetting;

    constructor(setting: BpmnModelerSetting) {
        super("BpmnModelerSettingQuery");
        this.setting = setting;
    }
}

// <================================== Queries ===================================
//
// =================================== Commands ==================================>
export class GetBpmnFileCommand extends Command {
    constructor() {
        super("GetBpmnFileCommand");
    }
}

export class GetDiagramAsSVGCommand extends Command {
    svg?: string;

    constructor() {
        super("GetDiagramAsSVGCommand");
    }
}

export class GetDmnFileCommand extends Command {
    constructor() {
        super("GetDmnFileCommand");
    }
}

export class GetFormKeysCommand extends Command {
    constructor() {
        super("GetFormKeysCommand");
    }
}

export class GetElementTemplatesCommand extends Command {
    constructor() {
        super("GetElementTemplatesCommand");
    }
}

export class GetBpmnModelerSettingCommand extends Command {
    constructor() {
        super("GetBpmnModelerSettingCommand");
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
