declare module "bpmn-js-properties-panel" {
    export const useService;
}

declare module "@bpmn-io/properties-panel" {
    export const isSelectEntryEdited;
    export const SelectEntry;
}

declare module "camunda-bpmn-js-behaviors/lib/util/ElementUtil" {
    export const createElement;
}

declare module "@bpmn-io/element-template-chooser" {
    export const ElementTemplateChooserModule;
}

declare module "bpmn-js-token-simulation" {
    export const TokenSimulationModule;
}

declare module "bpmn-js-create-append-anything" {
    export const CreateAppendElementTemplatesModule;
}

declare module "bpmn-js-native-copy-paste/lib/PasteUtil.js" {
    export function createReviver(moddle: any): (key: string, value: any) => any;
}
