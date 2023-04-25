declare module "dmn-js/lib/Modeler" {
    import EventBus from "diagram-js/lib/core/EventBus";
    import { ViewerOptions } from "diagram-js/lib/model";
    export default class DmnModeler {
        constructor(options?: ViewerOptions): DmnModeler;
        importXML(xml: string): Promise<DiagramWarning>;
        saveXML({ format: boolean }): Promise<{ xml: string }>;
        get<T extends ServiceName | string>(service: T): Service<T>;
        on<T extends Event>(event: T, callback: Callback<T>): void;
    }

    export type DiagramWarning = {
        warnings: WarningArray
    };

    export interface MessageObject {
        message: string;
    }

    export type DmnJsError = {
        message: string,
        stack: string,
    };

    export type WarningArray = [
        {
            message: string,
            error: DmnJsError,
        },
    ];

    export type ErrorArray = [
        error: DmnJsError,
    ];

    export type Event =
        | ElementTemplateEvent;

    export interface ElementTemplateObject {
        errors: ErrorArray;
    }

    export type CallbackObject<T extends Event> =
        T extends ElementTemplateEvent ? ElementTemplateObject : any;

    export type Callback<T extends Event> = (e: CallbackObject<T>) => void;

    export type ServiceName =
        | "eventBus"
        | "elementTemplatesLoader";

    export type Service<T extends string> = ServiceMap extends Record<T, infer E> ? E : any;

    interface ServiceMap {
        eventBus: EventBus;
    }
}

declare module "dmn-js-properties-panel" {
    export const DmnPropertiesPanelModule: any;
    export const DmnPropertiesProviderModule: any;
}

declare module "@bpmn-io/properties-panel" {
    export const isSelectEntryEdited: any;
    export const SelectEntry: any;
}

declare module "dmn-js/lib/util/ModelUtil" {
    export const is: any;
}
