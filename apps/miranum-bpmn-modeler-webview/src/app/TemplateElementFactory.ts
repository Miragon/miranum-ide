import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";

export class TemplateElementFactory {
    private readonly commandStack: any;

    private readonly elementFactory: any;

    constructor(modeler: any) {
        this.commandStack = modeler.get("commandStack");
        this.elementFactory = modeler.get("elementFactory");
    }

    /**
     * Create an element based on an element template.
     */
    public create(template: any) {
        const commandStack = this.commandStack;

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

    private setModelerTemplate(element: any, template: any) {
        const { id, version } = template;

        const businessObject = getBusinessObject(element);

        businessObject.set("camunda:modelerTemplate", id);
        businessObject.set("camunda:modelerTemplateVersion", version);
    }
}
