import {
    createInputParameter,
    ensureExtension,
    shouldUpdate,
} from "./utils/CreateHelper";
import { getDefaultValue } from "./utils/Helper";

export default class InputBindingProvider {
    static create(element: any, options: any) {
        const { property, bpmnFactory } = options;

        const { binding } = property;

        const value = getDefaultValue(property);

        const ioMapping = ensureExtension(element, "zeebe:IoMapping", bpmnFactory);

        if (!shouldUpdate(value, property)) {
            return;
        }

        const input = createInputParameter(binding, value, bpmnFactory);
        input.$parent = ioMapping;
        ioMapping.get("inputParameters").push(input);
    }
}
