// import {
//     createCamundaProperty,
//     ensureExtension,
//     shouldUpdate,
// } from "./utils/CreateHelper";
// import { getDefaultValue } from "./utils/Helper";
//
// export default class CamundaPropertiesProvider {
//     static create(element: any, options: any) {
//         const { property, bpmnFactory } = options;
//
//         const { binding } = property;
//
//         const value = getDefaultValue(property);
//
//         const camundaProperties = ensureExtension(
//             element,
//             "camunda:Properties",
//             bpmnFactory,
//         );
//
//         if (!shouldUpdate(value, property)) {
//             return;
//         }
//
//         const zeebeProperty = createCamundaProperty(binding, value, bpmnFactory);
//         zeebeProperty.$parent = camundaProperties;
//         camundaProperties.get("properties").push(zeebeProperty);
//     }
// }
