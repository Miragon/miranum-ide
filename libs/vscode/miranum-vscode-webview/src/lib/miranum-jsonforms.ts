import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

import { Command, Query } from "./messages";

// =================================== Queries ==================================>

export class JsonFormQuery extends Query {
    public readonly schema: JsonSchema;

    public readonly uischema: UISchemaElement;

    /**
     * @param jsonForm
     * @throws {SyntaxError} if the schema or uischema is not a valid JSON string
     */
    constructor(jsonForm: string) {
        super("JsonFormQuery");
        const jsonFormObj = JSON.parse(jsonForm);
        this.schema = jsonFormObj.schema;
        this.uischema = jsonFormObj.uischema;
    }
}

export type RendererOption = "vanilla" | "vuetify";

function isOfTypeRendererOption(value: string): value is RendererOption {
    return ["vanilla", "vuetify"].includes(value);
}

export class SettingQuery extends Query {
    public readonly renderer: RendererOption;

    constructor(renderer: string) {
        super("SettingQuery");

        if (isOfTypeRendererOption(renderer)) {
            this.renderer = renderer;
        } else {
            // FIXME: Maybe it's better to throw an error
            this.renderer = "vuetify";
        }
    }
}

// <================================== Queries ===================================
//
// =================================== Commands ==================================>
export class GetJsonFormCommand extends Command {
    constructor() {
        super("GetJsonFormCommand");
    }
}

export class GetSettingCommand extends Command {
    constructor() {
        super("GetSettingCommand");
    }
}

// <================================== Commands ===================================
