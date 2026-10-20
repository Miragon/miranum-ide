import zeebeModdle from "zeebe-bpmn-moddle/resources/zeebe.json";
import ElementTemplateIconRendererModule from "@bpmn-io/element-template-icon-renderer";
import CamundaCloudBehaviorsModule from "camunda-bpmn-js-behaviors/lib/camunda-cloud";
import { ZeebePropertiesProviderModule, ZeebeTooltipProvider } from "bpmn-js-properties-panel";
import { CloudElementTemplatesPropertiesProviderModule } from "bpmn-js-element-templates";
import { ZeebeVariableResolverModule } from "@bpmn-io/variable-resolver";
import ExampleDataPropertiesProviderModule from "@camunda/example-data-properties-provider";
import ColorPickerModule from "bpmn-js-color-picker";
import {
    CreateAppendAnythingModule,
    CreateAppendElementTemplatesModule,
} from "bpmn-js-create-append-anything";
import CamundaDetailsPopupMenuModule from "camunda-bpmn-js/lib/camunda-cloud/features/popup-menu";
import ElementDescriptionsModule from "camunda-bpmn-js/lib/base/features/element-descriptions";
import CreateAppendTabsModule from "camunda-bpmn-js/lib/base/features/create-append-tabs";
import { BPMN_TAB } from "camunda-bpmn-js/lib/base/features/create-append-tabs/tabs";
import { sharedLeadingModules, sharedTrailingModules } from "./sharedModules";
import type { EngineStack } from "./engineStack";

const FEEL_POPUP_LINKS = {
    feel: {
        title: "Learn FEEL expressions",
        href: "https://docs.camunda.io/docs/components/modeler/feel/what-is-feel/",
    },
    feelers: {
        title: "Learn templating",
        href: "https://docs.camunda.io/docs/components/modeler/forms/configuration/forms-config-templating-syntax/",
    },
} as const;

export const c8Stack: EngineStack = {
    upstreamModules: [
        ...sharedLeadingModules,
        ElementTemplateIconRendererModule,
        CamundaCloudBehaviorsModule,
        ZeebePropertiesProviderModule,
        CloudElementTemplatesPropertiesProviderModule,
        CreateAppendAnythingModule,
        CreateAppendElementTemplatesModule,
        ColorPickerModule,
        ZeebeVariableResolverModule,
        ExampleDataPropertiesProviderModule,
        CamundaDetailsPopupMenuModule,
        ElementDescriptionsModule,
        CreateAppendTabsModule,
        ...sharedTrailingModules,
    ],
    engineModules: [],
    moddleExtensions: { zeebe: zeebeModdle },
    propertiesPanelDefaults: {
        tooltip: ZeebeTooltipProvider,
        getFeelPopupLinks: (type: string) => {
            const link = FEEL_POPUP_LINKS[type as keyof typeof FEEL_POPUP_LINKS];
            return link ? [link] : undefined;
        },
    },
    popupMenuDefaults: { defaultTab: BPMN_TAB },
};
