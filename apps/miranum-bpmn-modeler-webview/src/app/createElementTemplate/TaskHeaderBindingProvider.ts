// import { createTaskHeader, ensureExtension } from "./utils/CreateHelper";
// import { getDefaultValue } from "./utils/Helper";
//
// export default class TaskHeaderBindingProvider {
//     static create(element: any, options: any) {
//         const { property, bpmnFactory } = options;
//
//         const { binding } = property;
//
//         const value = getDefaultValue(property);
//
//         const taskHeaders = ensureExtension(element, "zeebe:TaskHeaders", bpmnFactory);
//
//         const header = createTaskHeader(binding, value, bpmnFactory);
//         header.$parent = taskHeaders;
//         taskHeaders.get("values").push(header);
//     }
// }
