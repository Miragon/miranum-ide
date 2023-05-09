declare module "dmn-js/lib/Modeler" {
    import { ViewerOptions } from "diagram-js/lib/model";
    export default class DmnModeler {
        constructor(options?: ViewerOptions): DmnModeler;

        importXML(xml: string): Promise<DiagramWarning>;

        saveXML({ format: boolean }): Promise<{ xml: string }>;

        getActiveView(): any;

        getActiveViewer(): any;
    }

    export type DiagramWarning = {
        warnings: WarningArray;
    };

    export type DmnJsError = {
        message: string;
        stack: string;
    };

    export type WarningArray = [
        {
            message: string;
            error: DmnJsError;
        },
    ];

    export type ErrorArray = [error: DmnJsError];
}

declare module "dmn-js-properties-panel" {
    export const DmnPropertiesPanelModule: any;
    export const DmnPropertiesProviderModule: any;
    export const CamundaPropertiesProviderModule: any;
}
