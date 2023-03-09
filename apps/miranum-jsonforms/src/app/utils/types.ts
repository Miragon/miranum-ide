import { JsonSchema, UISchemaElement } from "@jsonforms/core";

export type JsonForm  = {
    schema: JsonSchema,
    uischema: UISchemaElement
    data: JSON
};
