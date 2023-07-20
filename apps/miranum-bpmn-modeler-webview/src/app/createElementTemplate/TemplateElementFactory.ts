import { Modeler } from "camunda-bpmn-js/lib/camunda-platform";

import { find } from "min-dash";

export class TemplateElementFactory {
    private readonly bpmnFactory;

    private readonly elementFactory;

    constructor(modeler: Modeler) {
        this.bpmnFactory = modeler.get("bpmnFactory");
        this.elementFactory = modeler.get("elementFactory");
    }

    /**
     * Create an element based on an element template.
     */
    public create(template) {
        const { properties } = template;

        // (1) base shape
        const element = this.createShape(template);

        // (2) apply template
        this.setModelerTemplate(element, template);

        // (3) apply icon
        if (hasIcon(template)) {
            this.setModelerTemplateIcon(element, template);
        }

        // (4) apply properties
        this.applyProperties(element, properties);

        return element;
    }

    private createShape(template) {
        const { appliesTo, elementType = {} } = template;
        const elementFactory = this.elementFactory;

        const attrs = {
            type: elementType.value || appliesTo[0],
        };

        // apply eventDefinition
        if (elementType.eventDefinition) {
            attrs.eventDefinitionType = elementType.eventDefinition;
        }

        return elementFactory.createShape(attrs);
    }

    private ensureExtensionElements(element) {
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

    private setModelerTemplate(element, template) {
        const { id, version } = template;

        const businessObject = getBusinessObject(element);

        businessObject.set("zeebe:modelerTemplate", id);
        businessObject.set("zeebe:modelerTemplateVersion", version);
    }

    private setModelerTemplateIcon(element, template) {
        const { icon } = template;

        const { contents } = icon;

        const businessObject = getBusinessObject(element);

        businessObject.set("zeebe:modelerTemplateIcon", contents);
    }

    /**
     * Apply properties to a given element.
     */
    private applyProperties(element, properties) {
        const processedProperties = [];

        properties.forEach((property) =>
            this.applyProperty(element, property, properties, processedProperties),
        );
    }

    /**
     * Apply a property and its parent properties to an element based on conditions.
     */
    private applyProperty(element, property, properties, processedProperties) {
        // skip if already processed
        if (processedProperties.includes(property)) {
            return;
        }

        // apply dependant property first if not already applied
        const dependentProperties = findDependentProperties(property, properties);

        dependentProperties.forEach((property) =>
            this.applyProperty(element, property, properties, processedProperties),
        );

        // check condition and apply property if condition is met
        if (isConditionMet(element, properties, property)) {
            this.bindProperty(property, element);
        }

        processedProperties.push(property);
    }

    /**
     * Bind property to element.
     */
    private bindProperty(property, element) {
        const { binding } = property;

        const { type: bindingType } = binding;

        const bindingProvider = this.providers[bindingType];

        bindingProvider.create(element, {
            property,
            bpmnFactory: this.bpmnFactory,
        });
    }
}

//
// helper
//
function hasIcon(template) {
    const { icon } = template;

    return !!(icon && icon.contents);
}

function findDependentProperties(property, properties) {
    const { condition } = property;

    if (!condition) {
        return [];
    }

    const dependentProperty = findProperyById(properties, condition.property);

    if (dependentProperty) {
        return [dependentProperty];
    }

    return [];
}

function findProperyById(properties, id) {
    return find(properties, function (property) {
        return property.id === id;
    });
}
