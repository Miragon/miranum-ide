import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";

export default class TemplateElementFactory {
    constructor(commandStack, elementFactory) {
        this._commandStack = commandStack;
        this._elementFactory = elementFactory;
    }

    /**
     * Create an element based on an element template.
     */
    create(template) {
        // (1) base shape
        const element = this._createShape(template);

        // (2) apply template
        this._setModelerTemplate(element, template);

        // (3)
        this._commandStack.execute("propertiesPanel.camunda.changeTemplate", {
            element,
            oldTemplate: null,
            newTemplate: template,
        });

        return element;
    }

    _createShape(template) {
        const elementFactory = this._elementFactory;
        const { appliesTo, elementType = {} } = template;

        const attrs = {
            type: elementType.value || appliesTo[0],
        };

        // apply eventDefinition
        if (elementType.eventDefinition) {
            attrs.eventDefinitionType = elementType.eventDefinition;
        }

        return elementFactory.createShape(attrs);
    }

    _setModelerTemplate(element, template) {
        const { id, version } = template;

        const businessObject = getBusinessObject(element);

        businessObject.set("camunda:modelerTemplate", id);
        businessObject.set("camunda:modelerTemplateVersion", version);
    }
}

TemplateElementFactory.$inject = ["commandStack", "elementFactory"];
