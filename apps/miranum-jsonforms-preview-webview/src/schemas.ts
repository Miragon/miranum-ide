import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

import { input as object } from "./example";

export const minimalSchema: JsonSchema = {
    type: "object",
    properties: {},
};

export const minimalUiSchema: UISchemaElement = {
    type: "VerticalLayout",
};

export const personSchema: JsonSchema = object.schema;
export const personUiSchema: UISchemaElement = object.uischema;
