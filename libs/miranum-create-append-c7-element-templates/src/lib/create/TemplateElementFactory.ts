import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";

export default class TemplateElementFactory {
    public static $inject: string[];

    private readonly commandStack: any;

    private readonly elementFactory: any;

    constructor(commandStack: any, elementFactory: any) {
        this.commandStack = commandStack;
        this.elementFactory = elementFactory;
    }

    /**
     * Create an element based on an element template.
     */
    public create(template: any) {
        // (1) base shape
        const element = this.createShape(template);

        // (2) apply template
        this.setModelerTemplate(element, template);

        // (3)
        this.commandStack.execute("propertiesPanel.camunda.changeTemplate", {
            element,
            oldTemplate: null,
            newTemplate: template,
        });

        return element;
    }

    private createShape(template: any) {
        const elementFactory = this.elementFactory;
        const { appliesTo, elementType = {} } = template;

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

TemplateElementFactory.$inject = ["commandStack", "elementFactory"];
