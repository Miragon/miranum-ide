declare module "bpmn-js/lib/Modeler" {
    import EventBus from "diagram-js/lib/core/EventBus";
    import { ViewerOptions } from "diagram-js/lib/model";
    export default class BpmnModeler {
        constructor(options?: ViewerOptions): BpmnModeler;
        importXML(xml: string): Promise<DiagramWarning>;
        saveXML({ format: boolean }): Promise<{ xml: string }>;
        get<T extends ServiceName | string>(service: T): Service<T>;
        on<T extends Event>(event: T, callback: Callback<T>): void;
    }

    export type DiagramWarning = {
        warnings: WarningArray;
    };

    export interface MessageObject {
        message: string;
    }

    export type BpmnJsError = {
        message: string;
        stack: string;
    };

    export type WarningArray = [
        {
            message: string;
            error: BpmnJsError;
        },
    ];

    export type ErrorArray = [error: BpmnJsError];

    export type ElementTemplateEvent = "elementTemplates.errors";

    export type Event = ElementTemplateEvent;

    export interface ElementTemplateObject {
        errors: ErrorArray;
    }

    export type CallbackObject<T extends Event> = T extends ElementTemplateEvent
        ? ElementTemplateObject
        : any;

    export type Callback<T extends Event> = (e: CallbackObject<T>) => void;

    export type ServiceName = "eventBus" | "elementTemplatesLoader";

    export type Service<T extends string> = ServiceMap extends Record<T, infer E>
        ? E
        : any;

    interface ServiceMap {
        eventBus: EventBus;
    }
}

declare module "bpmn-js-properties-panel" {
    export const BpmnPropertiesPanelModule: any;
    export const BpmnPropertiesProviderModule: any;
    export const CamundaPlatformPropertiesProviderModule: any;
    export const ElementTemplatesPropertiesProviderModule: any;
    export const ZeebePropertiesProviderModule: any;
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
