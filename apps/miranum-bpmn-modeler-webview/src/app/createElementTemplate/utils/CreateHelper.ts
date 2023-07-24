// import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";
// import { assign } from "min-dash";
// import { createElement, nextId } from "./ElementUtil";
// import { findExtension } from "./Helper";
//
// /**
//  * Retrieves whether an element should be updated for a given property.
//  *
//  * That matches once
//  * a) the property value is not empty, or
//  * b) the property is not optional
//  *
//  * @param {String} value
//  * @param {Object} property
//  * @returns {Boolean}
//  */
// export function shouldUpdate(value: any, property: any) {
//     const { optional } = property;
//
//     return value || !optional;
// }
//
// /**
//  * Gets or, in case not existent, creates extension element for given element.
//  *
//  * @param {djs.model.Base} element
//  * @param {String} type
//  * @param {BpmnFactory} bpmnFactory
//  * @returns {ModdleElement}
//  */
// export function ensureExtension(element: any, type: any, bpmnFactory: any) {
//     const businessObject = getBusinessObject(element);
//     let extensionElements = businessObject.get("extensionElements");
//
//     if (!extensionElements) {
//         extensionElements = createElement(
//             "bpmn:ExtensionElements",
//             {},
//             businessObject,
//             bpmnFactory,
//         );
//         businessObject.set("extensionElements", extensionElements);
//     }
//
//     let extension = findExtension(extensionElements, type);
//
//     if (!extension) {
//         extension = bpmnFactory.create(type);
//         extension.$parent = extensionElements;
//         extensionElements.get("values").push(extension);
//     }
//
//     return extension;
// }
//
// /**
//  * Create an input parameter representing the given
//  * binding and value.
//  *
//  * @param {PropertyBinding} binding
//  * @param {String} value
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createInputParameter(binding: any, value: any, bpmnFactory: any) {
//     const { name, scriptFormat } = binding;
//
//     let parameterValue, parameterDefinition;
//
//     if (scriptFormat) {
//         parameterDefinition = bpmnFactory.create("camunda:Script", {
//             scriptFormat,
//             value,
//         });
//     } else {
//         parameterValue = value;
//     }
//
//     return bpmnFactory.create("camunda:InputParameter", {
//         name,
//         value: parameterValue,
//         definition: parameterDefinition,
//     });
// }
//
// /**
//  * Create an output parameter representing the given
//  * binding and value.
//  *
//  * @param {PropertyBinding} binding
//  * @param {String} value
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createOutputParameter(binding: any, value: any, bpmnFactory: any) {
//     const { scriptFormat, source } = binding;
//
//     let parameterValue, parameterDefinition;
//
//     if (scriptFormat) {
//         parameterDefinition = bpmnFactory.create("camunda:Script", {
//             scriptFormat,
//             value: source,
//         });
//     } else {
//         parameterValue = source;
//     }
//
//     return bpmnFactory.create("camunda:OutputParameter", {
//         name: value,
//         value: parameterValue,
//         definition: parameterDefinition,
//     });
// }
//
// /**
//  * Create camunda property from the given binding.
//  *
//  * @param {PropertyBinding} binding
//  * @param {String} value
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createCamundaProperty(binding: any, bpmnFactory: any, value = "") {
//     const { name } = binding;
//
//     return bpmnFactory.create("camunda:Property", {
//         name,
//         value,
//     });
// }
//
// /**
//  * Create camunda:in element from given binding.
//  *
//  * @param {PropertyBinding} binding
//  * @param {String} value
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createCamundaIn(binding: any, value: any, bpmnFactory: any) {
//     const attrs = createCamundaInOutAttrs(binding, value);
//
//     return bpmnFactory.create("camunda:In", attrs);
// }
//
// /**
//  * Create camunda:in with businessKey element from given binding.
//  *
//  * @param {String} value
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createCamundaInWithBusinessKey(value: any, bpmnFactory: any) {
//     return bpmnFactory.create("camunda:In", {
//         businessKey: value,
//     });
// }
//
// /**
//  * Create camunda:out element from given binding.
//  *
//  * @param {PropertyBinding} binding
//  * @param {String} value
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createCamundaOut(binding: any, value: any, bpmnFactory: any) {
//     const attrs = createCamundaInOutAttrs(binding, value);
//
//     return bpmnFactory.create("camunda:Out", attrs);
// }
//
// /**
//  * Create camunda:executionListener element containing an inline script from given binding.
//  *
//  * @param {PropertyBinding} binding
//  * @param {String} value
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createCamundaExecutionListenerScript(
//     binding: any,
//     value: any,
//     bpmnFactory: any,
// ) {
//     const { event, scriptFormat } = binding;
//
//     let parameterValue, parameterDefinition;
//
//     if (scriptFormat) {
//         parameterDefinition = bpmnFactory.create("camunda:Script", {
//             scriptFormat,
//             value,
//         });
//     } else {
//         parameterValue = value;
//     }
//
//     return bpmnFactory.create("camunda:ExecutionListener", {
//         event,
//         value: parameterValue,
//         script: parameterDefinition,
//     });
// }
//
// /**
//  * Create camunda:field element containing string or expression from given binding.
//  *
//  * @param {PropertyBinding} binding
//  * @param {String} value
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createCamundaFieldInjection(binding: any, value: any, bpmnFactory: any) {
//     const DEFAULT_PROPS = {
//         string: undefined,
//         expression: undefined,
//         name: undefined,
//     };
//
//     const props = assign({}, DEFAULT_PROPS);
//
//     const { expression, name } = binding;
//
//     if (!expression) {
//         props.string = value;
//     } else {
//         props.expression = value;
//     }
//     props.name = name;
//
//     return bpmnFactory.create("camunda:Field", props);
// }
//
// /**
//  * Create camunda:errorEventDefinition element containing expression and errorRef
//  * from given binding.
//  *
//  * @param {String} expression
//  * @param {ModdleElement} errorRef
//  * @param {ModdleElement} parent
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return {ModdleElement}
//  */
// export function createCamundaErrorEventDefinition(
//     expression: any,
//     errorRef: any,
//     parent: any,
//     bpmnFactory: any,
// ) {
//     const errorEventDefinition = bpmnFactory.create("camunda:ErrorEventDefinition", {
//         errorRef,
//         expression,
//     });
//
//     errorEventDefinition.$parent = parent;
//
//     return errorEventDefinition;
// }
//
// /**
//  * Create bpmn:error element containing a specific error id given by a binding.
//  *
//  * @param {String} bindingErrorRef
//  * @param {ModdleElement} parent
//  * @param {BpmnFactory} bpmnFactory
//  *
//  * @return { ModdleElement }
//  */
// export function createError(bindingErrorRef: any, parent: any, bpmnFactory: any) {
//     const error = bpmnFactory.create("bpmn:Error", {
//         // we need to later retrieve the error from a binding
//         id: nextId("Error_" + bindingErrorRef + "_"),
//     });
//
//     error.$parent = parent;
//
//     return error;
// }
//
// // helpers //////////
//
// /**
//  * Create properties for camunda:in and camunda:out types.
//  */
// function createCamundaInOutAttrs(binding: any, value: any) {
//     const properties: any = {};
//
//     const { expression, source, sourceExpression, target, type, variables } = binding;
//
//     // explicitly cover all conditions as specified here:
//     // https://github.com/camunda/camunda-modeler/blob/develop/docs/element-templates/README.md#camundain
//     if (type === "camunda:in") {
//         if (target && !expression && !variables) {
//             properties.target = target;
//             properties.source = value;
//         } else if (target && expression === true && !variables) {
//             properties.target = target;
//             properties.sourceExpression = value;
//         } else if (!target && !expression && variables === "local") {
//             properties.local = true;
//             properties.variables = "all";
//         } else if (target && !expression && variables === "local") {
//             properties.local = true;
//             properties.source = value;
//             properties.target = target;
//         } else if (target && expression && variables === "local") {
//             properties.local = true;
//             properties.sourceExpression = value;
//             properties.target = target;
//         } else if (!target && !expression && variables === "all") {
//             properties.variables = "all";
//         } else {
//             throw new Error(
//                 "invalid configuration for camunda:in element template binding",
//             );
//         }
//     }
//
//     // explicitly cover all conditions as specified here:
//     // https://github.com/camunda/camunda-modeler/blob/develop/docs/element-templates/README.md#camundaout
//     if (type === "camunda:out") {
//         if (source && !sourceExpression && !variables) {
//             properties.target = value;
//             properties.source = source;
//         } else if (!source && sourceExpression && !variables) {
//             properties.target = value;
//             properties.sourceExpression = sourceExpression;
//         } else if (!source && !sourceExpression && variables === "all") {
//             properties.variables = "all";
//         } else if (source && !sourceExpression && variables === "local") {
//             properties.local = true;
//             properties.source = source;
//             properties.target = value;
//         } else if (!source && sourceExpression && variables === "local") {
//             properties.local = true;
//             properties.sourceExpression = sourceExpression;
//             properties.target = value;
//         } else if (!source && !sourceExpression && variables === "local") {
//             properties.local = true;
//             properties.variables = "all";
//         } else {
//             throw new Error(
//                 "invalid configuration for camunda:out element template binding",
//             );
//         }
//     }
//
//     return properties;
// }
