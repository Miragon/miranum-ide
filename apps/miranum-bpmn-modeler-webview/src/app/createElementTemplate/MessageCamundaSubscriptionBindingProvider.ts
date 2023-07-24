// import { getBusinessObject, is } from "bpmn-js/lib/util/ModelUtil";
// import { ensureExtension, shouldUpdate } from "./utils/CreateHelper";
// import { getDefaultValue, getTemplateId } from "./utils/Helper";
//
// export class MessageCamundaSubscriptionBindingProvider {
//     static create(element: any, options: any) {
//         const { bpmnFactory, property } = options;
//
//         const { binding } = property;
//
//         const { name } = binding;
//
//         const value = getDefaultValue(property);
//
//         let businessObject = getBusinessObject(element);
//         if (is(businessObject, "bpmn:Event")) {
//             businessObject = businessObject.get("eventDefinitions")[0];
//         }
//
//         let message = businessObject.get("messageRef");
//         if (!message) {
//             message = bpmnFactory.create("bpmn:Message", {
//                 "camunda:modelerTemplate": getTemplateId(element),
//             });
//             businessObject.set("messageRef", message);
//         }
//
//         const subscription = ensureExtension(message, "zeebe:Subscription", bpmnFactory);
//
//         if (!shouldUpdate(value, property)) {
//             return;
//         }
//
//         subscription.set(name, value);
//     }
// }
