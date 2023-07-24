import {
    createZeebeProperty,
    ensureExtension,
    shouldUpdate,
} from "./utils/CreateHelper";
import { getDefaultValue } from "./utils/Helper";

export default class ZeebePropertiesProvider {
    static create(element: any, options: any) {
        const { property, bpmnFactory } = options;

        const { binding } = property;

        const value = getDefaultValue(property);

        const zeebeProperties = ensureExtension(
            element,
            "zeebe:Properties",
            bpmnFactory,
        );

        if (!shouldUpdate(value, property)) {
            return;
        }

        const zeebeProperty = createZeebeProperty(binding, value, bpmnFactory);
        zeebeProperty.$parent = zeebeProperties;
        zeebeProperties.get("properties").push(zeebeProperty);
    }
}
