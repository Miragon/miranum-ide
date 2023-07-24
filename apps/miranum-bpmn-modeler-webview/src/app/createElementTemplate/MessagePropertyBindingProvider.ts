import { getBusinessObject, is } from "bpmn-js/lib/util/ModelUtil";
import { getDefaultValue, getTemplateId } from "./utils/Helper";

export class MessagePropertyBindingProvider {
    static create(element: any, options: any) {
        const { bpmnFactory, property } = options;

        const { binding } = property;

        const { name } = binding;

        const value = getDefaultValue(property);

        let businessObject = getBusinessObject(element);

        if (is(businessObject, "bpmn:Event")) {
            businessObject = businessObject.get("eventDefinitions")[0];
        }

        let message = businessObject.get("messageRef");

        if (!message) {
            message = bpmnFactory.create("bpmn:Message", {
                "zeebe:modelerTemplate": getTemplateId(element),
            });
            businessObject.set("messageRef", message);
        }

        message.set(name, value);
    }
}
