import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";

import { findExtension } from "./Helper";
import { createElement } from "./ElementUtil";

/**
 * Create an input parameter representing the given
 * binding and value.
 */
export function createInputParameter(binding: any, value: any, bpmnFactory: any) {
    const { name } = binding;

    return bpmnFactory.create("camunda:inputParameter", {
        source: value,
        target: name,
    });
}

/**
 * Create an output parameter representing the given
 * binding and value.
 *
 * @param {PropertyBinding} binding
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement}
 */
export function createOutputParameter(binding: any, value: any, bpmnFactory: any) {
    const { source } = binding;

    return bpmnFactory.create("camunda:outputParameter", {
        source,
        target: value,
    });
}

/**
 * Create a task header representing the given
 * binding and value.
 *
 * @param {PropertyBinding} binding
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement}
 */
export function createTaskHeader(binding: any, value: any, bpmnFactory: any) {
    const { key } = binding;

    return bpmnFactory.create("zeebe:Header", {
        key,
        value,
    });
}

/**
 * Create a task definition representing the given value.
 *
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement}
 */
export function createTaskDefinitionWithType(value: any, bpmnFactory: any) {
    return bpmnFactory.create("zeebe:TaskDefinition", {
        type: value,
    });
}

/**
 * Create zeebe:Property from the given binding.
 *
 * @param {PropertyBinding} binding
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement}
 */
export function createZeebeProperty(binding: any, bpmnFactory: any, value = "") {
    const { name } = binding;

    return bpmnFactory.create("camunda:property", {
        name,
        value,
    });
}

/**
 * Retrieves whether an element should be updated for a given property.
 *
 * That matches once
 * a) the property value is not empty, or
 * b) the property is not optional
 *
 * @param {String} value
 * @param {Object} property
 * @returns {Boolean}
 */
export function shouldUpdate(value: any, property: any) {
    const { optional } = property;

    return value || !optional;
}

/**
 * Gets or, in case not existent, creates extension element for given element.
 *
 * @param {djs.model.Base} element
 * @param {String} type
 * @param {BpmnFactory} bpmnFactory
 * @returns {ModdleElement}
 */
export function ensureExtension(element: any, type: any, bpmnFactory: any) {
    const businessObject = getBusinessObject(element);
    let extensionElements = businessObject.get("extensionElements");

    if (!extensionElements) {
        extensionElements = createElement(
            "bpmn:ExtensionElements",
            {},
            businessObject,
            bpmnFactory,
        );
        businessObject.set("extensionElements", extensionElements);
    }

    let extension = findExtension(extensionElements, type);

    if (!extension) {
        extension = bpmnFactory.create(type);
        extension.$parent = extensionElements;
        extensionElements.get("values").push(extension);
    }

    return extension;
}
