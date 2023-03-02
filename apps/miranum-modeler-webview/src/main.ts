import { WebviewApi } from "vscode-webview";
import { VscState } from "./types/VsCode";
import { ContentController } from "./app/ContentController";
import { VscController } from "./app/VscController";
import BpmnModeler from "bpmn-js/lib/Modeler";
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule, ElementTemplatesPropertiesProviderModule,
} from "bpmn-js-properties-panel";
import CamundaPlatformBehaviors from "camunda-bpmn-js-behaviors/lib/camunda-platform";
import camundaModdleDescriptors from "camunda-bpmn-moddle/resources/camunda.json";
import ElementTemplateChooserModule from "@bpmn-io/element-template-chooser";
//import miragonProviderModule from "./app/PropertieProvider/provider";
import TokenSimulationModule from "bpmn-js-token-simulation";

// css
import "./styles.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js-properties-panel/dist/assets/properties-panel.css";
import "bpmn-js-properties-panel/dist/assets/element-templates.css";
import "@bpmn-io/element-template-chooser/dist/element-template-chooser.css";
import "bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css";

declare const vscode: WebviewApi<VscState>;

const modeler = new BpmnModeler({
    container: "#js-canvas",
    keyboard: {
        bindTo: document,
    },
    propertiesPanel: {
        parent: "#js-properties-panel",
    },
    additionalModules: [
        // Properties Panel
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        CamundaPlatformPropertiesProviderModule,
        CamundaPlatformBehaviors,
        //miragonProviderModule,
        // Element Templates
        ElementTemplatesPropertiesProviderModule,
        ElementTemplateChooserModule,
        // Other Plugins
        TokenSimulationModule,
    ],
    moddleExtensions: {
        camunda: camundaModdleDescriptors,
    },
});

function init() {
    const vscController = new VscController(vscode);
    const state = vscController.getState();
    try {
        const contentController = new ContentController(modeler, vscController, state.bpmn, state.files);
        vscController.setListener(contentController);
    } catch (error) {
        console.error(`[MiranumModeler.Webview]: ${error}`);
    }
}

init();
