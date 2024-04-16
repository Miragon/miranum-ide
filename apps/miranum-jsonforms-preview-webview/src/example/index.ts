import schema from "./schema.json";
import uischema from "./uischema.json";
import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

export const input: {
    schema: JsonSchema;
    uischema: UISchemaElement;
} = { schema, uischema };
