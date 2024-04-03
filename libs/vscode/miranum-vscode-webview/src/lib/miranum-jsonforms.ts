import { JsonSchema, Layout } from "@jsonforms/core";

import { Command, Query } from "./messages";

// =================================== Queries ==================================>

export class SchemaQuery extends Query {
    public readonly schema: JsonSchema;

    /**
     * @param schema
     * @throws {SyntaxError} if the schema is not a valid JSON string
     */
    constructor(schema: string) {
        super("SchemaQuery");
        this.schema = JSON.parse(schema);
    }
}

export class UiSchemaQuery extends Query {
    public readonly uiSchema: Layout;

    /**
     * @param uiSchema
     * @throws {SyntaxError} if the uiSchema is not a valid JSON string
     */
    constructor(uiSchema: string) {
        super("UiSchemaQuery");
        this.uiSchema = JSON.parse(uiSchema);
    }
}

export enum Renderer {
    VANILLA = "vanilla",
    VUETIFY = "vuetify",
}

export class SettingQuery extends Query {
    public readonly renderer: Renderer;

    constructor(renderer: Renderer) {
        super("SettingQuery");
        this.renderer = renderer;
    }
}

// <================================== Queries ===================================
//
// =================================== Commands ==================================>
export class GetSchemaCommand extends Command {
    constructor() {
        super("GetSchemaCommand");
    }
}

export class GetUiSchemaCommand extends Command {
    constructor() {
        super("GetUiSchemaCommand");
    }
}

export class GetSettingCommand extends Command {
    constructor() {
        super("GetSettingCommand");
    }
}

// <================================== Commands ===================================
