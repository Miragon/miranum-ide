import { isSelectEntryEdited, SelectEntry } from "@bpmn-io/properties-panel";
import { useService } from "bpmn-js-properties-panel";
import { useEffect, useState } from "@bpmn-io/properties-panel/preact/hooks";
import { getBusinessObject, is } from "bpmn-js/lib/util/ModelUtil";
import { without } from "min-dash";
import { createElement } from "camunda-bpmn-js-behaviors/lib/util/ElementUtil";
import { getFormKeys } from "../../../formKeys";

export default function (element: any) {
    return [
        {
            id: "inputParameter",
            element,
            component: Form,
            isEdited: isSelectEntryEdited,
        },
    ];
}

function Form(props: any) {
    const { element, id } = props;
    // injections
    const modeling = useService("modeling");
    const bpmnFactory = useService("bpmnFactory");
    const translate = useService("translate");
    const debounce = useService("debounceInput");

    // currently hard-coded binding
    // needed for InputParameter - setValue/getValue
    const binding = {
        type: "camunda:inputParameter",
        name: "app_task_schema_key",
    };
    // both are currently only used for getValue(), if a input has already been allocated
    const inputOutput = findExtension(getBusinessObject(element), "camunda:InputOutput");
    const inputParameter = inputOutput && findInputParameter(inputOutput, binding);

    const getValue = () => {
        if (inputParameter) {
            return inputParameter.value;
        }
        return "";
    };

    const setValue = (value: any) => {
        const property = {
            value: value,
            binding: binding,
        };

        if (value) {
            addInputParameter(element, property, bpmnFactory, modeling);
        } else {
            removeInputParameter(element, property.binding, modeling);
        }
    };

    // fetch forms (from window variable) and fill Forms with it
    const [forms, setForms] = useState<string[]>([]);
    useEffect(() => {
        setForms(getFormKeys()); // window.forms);
    }, [setForms]);

    const getOptions = () => {
        return [
            { label: "<none>", value: undefined },
            ...forms.map((form) => ({
                label: form,
                value: form,
            })),
        ];
    };

    return SelectEntry({
        element,
        id: { id },
        label: translate("Choose your Form"),
        getOptions,
        getValue,
        setValue,
        debounce,
    });
}

// add or change
function addInputParameter(
    element: any,
    property: any,
    bpmnFactory: any,
    modeling: any,
) {
    const { binding, value } = property;

    const businessObject = getBusinessObject(element); // alternative: element.businessObject
    let extensionElements = businessObject.get("extensionElements");
    let inputOutput = findExtension(businessObject, "camunda:InputOutput"); // already as a global variable
    let updatedBusinessObject, update;

    // goes through all possibilities and sets updateBusinessObject & update accordingly
    // case: nothing exists
    if (!extensionElements) {
        updatedBusinessObject = businessObject;
        extensionElements = createExtensionElements(businessObject, bpmnFactory);
        inputOutput = createInputOutput(binding, value, bpmnFactory, extensionElements);
        extensionElements.values.push(inputOutput);
        update = { extensionElements };

        // case: Input has existed, but has been deleted again
    } else if (!inputOutput) {
        updatedBusinessObject = extensionElements;
        inputOutput = createInputOutput(binding, value, bpmnFactory, extensionElements);
        update = { values: extensionElements.get("values").concat(inputOutput) };

        // case: input exists, but key is already used => overwrite
    } else if (findInputParameter(inputOutput, binding)) {
        removeInputParameter(element, binding, modeling);

        updatedBusinessObject = extensionElements;
        inputOutput = createInputOutput(binding, value, bpmnFactory, extensionElements);
        update = { values: extensionElements.get("values").concat(inputOutput) };

        // case: input exists, and key isn't allocated yet
    } else {
        updatedBusinessObject = inputOutput;

        const inputParameter = createInputParameter(binding, value, bpmnFactory);
        inputParameter.$parent = inputOutput;
        update = {
            inputParameters: inputOutput
                .get("camunda:inputParameters")
                .concat(inputParameter),
        };
    }
    // write into xml
    modeling.updateModdleProperties(element, updatedBusinessObject, update);
}

function removeInputParameter(element: any, binding: any, modeling: any) {
    const businessObject = getBusinessObject(element);

    const inputOutput = findExtension(businessObject, "camunda:InputOutput"),
        inputParameters = inputOutput.get("camunda:inputParameters");

    const inputParameter = findInputParameter(inputOutput, binding);

    // delete External Task paragraph from xml
    modeling.updateModdleProperties(element, inputOutput, {
        inputParameters: without(inputParameters, inputParameter),
    });
}

//     -----------------------------HELPERS-----------------------------     \\

function createExtensionElements(businessObject: any, bpmnFactory: any) {
    return createElement(
        "bpmn:ExtensionElements",
        { values: [] },
        businessObject,
        bpmnFactory,
    );
}

function createInputOutput(
    binding: any,
    value: any,
    bpmnFactory: any,
    extensionElements: any,
) {
    const inputParameter = createInputParameter(binding, value, bpmnFactory);
    const inputOutput = createElement(
        "camunda:InputOutput",
        {
            inputParameters: [inputParameter],
            outputParameters: [],
        },
        extensionElements,
        bpmnFactory,
    );

    inputParameter.$parent = inputOutput;
    return inputOutput;
}

/**
 * Create an input parameter representing the given
 * binding and value.
 *
 * @param {PropertyBinding} binding
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement}
 */
function createInputParameter(binding: any, value: any, bpmnFactory: any) {
    const { name, scriptFormat } = binding;

    let parameterValue, parameterDefinition;

    if (scriptFormat) {
        parameterDefinition = bpmnFactory.create("camunda:Script", {
            scriptFormat,
            value,
        });
    } else {
        parameterValue = value;
    }

    return bpmnFactory.create("camunda:InputParameter", {
        name,
        value: parameterValue,
        definition: parameterDefinition,
    });
}

/**
 * Find extension with given type in
 * BPMN element, diagram element or ExtensionElement.
 *
 * @param {ModdleElement|djs.model.Base} element
 * @param {String} type
 *
 * @return {ModdleElement} the extension
 */
function findExtension(element: any, type: any) {
    const businessObject = getBusinessObject(element);

    let extensionElements;

    if (is(businessObject, "bpmn:ExtensionElements")) {
        extensionElements = businessObject;
    } else {
        extensionElements = businessObject.get("extensionElements");
    }

    if (!extensionElements) {
        return null;
    }

    return extensionElements.get("values").find((value: any) => {
        return is(value, type);
    });
}

function findInputParameter(inputOutput: any, binding: any) {
    const parameters = inputOutput.get("inputParameters");

    return parameters.find((parameter: any) => {
        return parameter.name === binding.name;
    });
}
