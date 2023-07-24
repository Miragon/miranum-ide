// import {
//     createOutputParameter,
//     ensureExtension,
//     shouldUpdate,
// } from "./utils/CreateHelper";
// import { getDefaultValue } from "./utils/Helper";
//
// export default class OutputBindingProvider {
//     static create(element: any, options: any) {
//         const { property, bpmnFactory } = options;
//
//         const { binding } = property;
//
//         const value = getDefaultValue(property);
//
//         const ioMapping = ensureExtension(element, "camunda:inputOutput", bpmnFactory);
//
//         if (!shouldUpdate(value, property)) {
//             return;
//         }
//
//         const output = createOutputParameter(binding, value, bpmnFactory);
//         output.$parent = ioMapping;
//         ioMapping.get("outputParameters").push(output);
//     }
// }
