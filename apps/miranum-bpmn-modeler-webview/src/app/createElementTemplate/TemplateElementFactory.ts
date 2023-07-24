import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";
// import { find } from "min-dash";
// import { isConditionMet } from "./utils/Condition";
// import PropertyBindingProvider from "./PropertyBindingProvider";
// import InputBindingProvider from "./InputBindingProvider";
// import OutputBindingProvider from "./OutputBindingProvider";
// import CamundaPropertiesProvider from "./CamundaPropertiesProvider";
// import {
//     CAMUNDA_INPUT_PARAMETER_TYPE,
//     CAMUNDA_OUTPUT_PARAMETER_TYPE,
//     CAMUNDA_PROPERTY_TYPE,
//     PROPERTY_TYPE,
// } from "./utils/bindingTypes";

export class TemplateElementFactory {
    private readonly commandStack: any;

    // private readonly bpmnFactory: any;

    private readonly elementFactory: any;

    // private providers: any = {
    //     [PROPERTY_TYPE]: PropertyBindingProvider,
    //     [CAMUNDA_PROPERTY_TYPE]: CamundaPropertiesProvider,
    //     [CAMUNDA_INPUT_PARAMETER_TYPE]: InputBindingProvider,
    //     [CAMUNDA_OUTPUT_PARAMETER_TYPE]: OutputBindingProvider,
    //     //[CAMUNDA_DELEGATE_EXPRESSION_TYPE]: TaskDefinitionTypeBindingProvider,
    //     //[ZEEBE_TASK_HEADER_TYPE]: TaskHeaderBindingProvider,
    //     //[MESSAGE_PROPERTY_TYPE]: MessagePropertyBindingProvider,
    //     //[MESSAGE_ZEEBE_SUBSCRIPTION_PROPERTY_TYPE]: MessageCamundaSubscriptionBindingProvider,
    // };

    constructor(modeler: any) {
        this.commandStack = modeler.get("commandStack");
        // this.bpmnFactory = modeler.get("bpmnFactory");
        this.elementFactory = modeler.get("elementFactory");
    }

    /**
     * Create an element based on an element template.
     */
    public create(template: any) {
        // const { properties } = template;

        const commandStack = this.commandStack;
        console.log("CommandStack");

        // (1) base shape
        const element = this.createShape(template);

        // (2) apply template
        this.setModelerTemplate(element, template);

        // (3)
        commandStack.execute("propertiesPanel.camunda.changeTemplate", {
            element,
            oldTemplate: null,
            newTemplate: template,
        });

        // (3) apply icon
        // if (hasIcon(template)) {
        //     this.setModelerTemplateIcon(element, template);
        // }

        // (4) apply properties
        // this.applyProperties(element, properties);

        return element;
    }

    private createShape(template: any) {
        const { appliesTo, elementType = {} } = template;
        const elementFactory = this.elementFactory;

        const attrs: any = {
            type: elementType.value || appliesTo[0],
        };

        // apply eventDefinition
        if (elementType.eventDefinition) {
            attrs.eventDefinitionType = elementType.eventDefinition;
        }

        return elementFactory.createShape(attrs);
    }

    /*
    private ensureExtensionElements(element: any) {
        const bpmnFactory = this.bpmnFactory;
        const businessObject = getBusinessObject(element);

        let extensionElements = businessObject.get("extensionElements");

        if (!extensionElements) {
            extensionElements = bpmnFactory.create("bpmn:ExtensionElements", {
                values: [],
            });

            extensionElements.$parent = businessObject;
            businessObject.set("extensionElements", extensionElements);
        }

        return extensionElements;
    }
    */

    private setModelerTemplate(element: any, template: any) {
        const { id, version } = template;

        const businessObject = getBusinessObject(element);

        businessObject.set("camunda:modelerTemplate", id);
        businessObject.set("camunda:modelerTemplateVersion", version);
    }

    // private setModelerTemplateIcon(element: any, template: any) {
    //     const { icon } = template;

    //     const { contents } = icon;

    //     const businessObject = getBusinessObject(element);

    //     businessObject.set("camunda:modelerTemplateIcon", contents);
    // }

    // private setProperty(element: any, templateProperties: any) {
    //     // get all properties with binding type = "property"
    //     const properties = templateProperties.filter((property: any) => {
    //         const binding = property.binding,
    //             bindingType = binding.type;

    //         return bindingType === "property";
    //     });

    //     if (!properties.length) {
    //         return;
    //     }

    //     for (const property of properties) {
    //         const bindingName = property.binding.name;
    //         const propertyValue = property.value;
    //     }
    // }

    // /**
    //  * Apply properties to a given element.
    //  */
    // private applyProperties(element: any, properties: any) {
    //     const processedProperties: any[] = [];

    //     properties.forEach((property: any) =>
    //         this.applyProperty(element, property, properties, processedProperties),
    //     );
    // }

    // /**
    //  * Apply a property and its parent properties to an element based on conditions.
    //  */
    // private applyProperty(
    //     element: any,
    //     property: any,
    //     properties: any,
    //     processedProperties: any,
    // ) {
    //     // skip if already processed
    //     if (processedProperties.includes(property)) {
    //         return;
    //     }

    //     // apply dependant property first if not already applied
    //     const dependentProperties = findDependentProperties(property, properties);

    //     dependentProperties.forEach((prop: any) =>
    //         this.applyProperty(element, prop, properties, processedProperties),
    //     );

    //     // check condition and apply property if condition is met
    //     if (isConditionMet(element, properties, property)) {
    //         this.bindProperty(property, element);
    //     }

    //     processedProperties.push(property);
    // }

    // /**
    //  * Bind property to element.
    //  */
    // private bindProperty(property: any, element: any) {
    //     const { binding } = property;

    //     const { type: bindingType } = binding;

    //     const bindingProvider = this.providers[bindingType];

    //     bindingProvider.create(element, {
    //         property,
    //         bpmnFactory: this.bpmnFactory,
    //     });
    // }
}

//
// helper
//
// function hasIcon(template: any) {
//     const { icon } = template;
//
//     return !!(icon && icon.contents);
// }

// function findDependentProperties(property: any, properties: any) {
//     const { condition } = property;
//
//     if (!condition) {
//         return [];
//     }
//
//     const dependentProperty = findPropertyById(properties, condition.property);
//
//     if (dependentProperty) {
//         return [dependentProperty];
//     }
//
//     return [];
// }
//
// function findPropertyById(properties: any, id: any) {
//     return find(properties, function (property: any) {
//         return property.id === id;
//     });
// }
