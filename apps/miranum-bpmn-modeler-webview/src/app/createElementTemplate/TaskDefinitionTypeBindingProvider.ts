import { ensureExtension } from "./utils/CreateHelper";
import { getDefaultValue } from "./utils/Helper";

export default class TaskDefinitionTypeBindingProvider {
    static create(element: any, options: any) {
        const { property, bpmnFactory } = options;

        const value = getDefaultValue(property);

        const taskDefinition = ensureExtension(
            element,
            "zeebe:TaskDefinition",
            bpmnFactory,
        );
        taskDefinition.set("type", value);
    }
}
