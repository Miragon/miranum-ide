import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";
import { getDefaultValue } from "./utils/Helper";

export default class PropertyBindingProvider {
    static create(element: any, options: any) {
        const { property } = options;

        const { binding } = property;

        const { name } = binding;

        const value = getDefaultValue(property);

        const businessObject = getBusinessObject(element);

        businessObject[name] = value;
    }
}
