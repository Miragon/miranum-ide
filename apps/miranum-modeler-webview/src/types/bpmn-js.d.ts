declare module "bpmn-js/lib/Modeler" {
    const BpmnJS: any;
    export default BpmnJS;
}

declare module "bpmn-js-properties-panel" {
    export const BpmnPropertiesPanelModule: any;
    export const BpmnPropertiesProviderModule: any;
    export const CamundaPlatformPropertiesProviderModule: any;
    export const ElementTemplatesPropertiesProviderModule: any;
    export const useService: any;
}

declare module "camunda-bpmn-js-behaviors/lib/camunda-platform" {
    const CamundaPlatformBehaviors: any;
    export default CamundaPlatformBehaviors;
}

declare module "@bpmn-io/element-template-chooser" {
    const ElementTemplateChooserModule: any;
    export default ElementTemplateChooserModule;
}

declare module "bpmn-js-token-simulation" {
    const TokenSimulationModule: any;
    export default TokenSimulationModule;
}

declare module "@bpmn-io/properties-panel" {
    export const isSelectEntryEdited: any;
    export const SelectEntry: any;
}

declare module "bpmn-js/lib/util/ModelUtil" {
    export const getBusinessObject: any;
    export const is: any;
}

declare module "camunda-bpmn-js-behaviors/lib/util/ElementUtil" {
    export const createElement: any;
}
