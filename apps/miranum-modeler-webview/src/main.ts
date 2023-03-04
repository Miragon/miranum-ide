import { WebviewApi } from "vscode-webview";
import { FolderContent, MessageType, VscState } from "./types/VsCode";
import { ContentController, ImportWarning, StateController } from "./app";
import debounce from "lodash.debounce";
import BpmnModeler, { ErrorArray, WarningArray } from "bpmn-js/lib/Modeler";
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
    ElementTemplatesPropertiesProviderModule,
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

//import elementTemp from "./assets/some-task.json";

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

const stateController = new StateController(vscode);
const contentController = new ContentController(modeler);

let isUpdateFromExtension = false;

function createMsg(baseMsg: string, messages: ErrorArray | WarningArray) {
    let msg = "";
    if (messages && messages.length > 0) {
        msg = baseMsg;
        for (const message of messages) {
            msg += `\n- ${message.message}`;
        }
    }
    return msg;
}

const updateXML = asyncDebounce(openXML, 100);
function asyncDebounce<F extends(...args: any[]) => Promise<any>>(func: F, wait?: number) {
    const resolveSet = new Set<(p:any)=>void>();
    const rejectSet = new Set<(p:any)=>void>();

    const debounced = debounce((args: Parameters<F>) => {
        func(...args)
            .then((...res) => {
                resolveSet.forEach((resolve) => resolve(...res));
                resolveSet.clear();
            })
            .catch((...res) => {
                rejectSet.forEach((reject) => reject(...res));
                rejectSet.clear();
            });
    }, wait);

    return (...args: Parameters<F>): ReturnType<F> => new Promise((resolve, reject) => {
        resolveSet.add(resolve);
        rejectSet.add(reject);
        debounced(args);
    }) as ReturnType<F>;
}

async function openXML(bpmn: string | undefined) {
    try {
        let result: ImportWarning;
        if (!bpmn) {
            result = (await contentController.newDiagram());
        } else {
            result = (await contentController.loadDiagram(bpmn));
        }
        stateController.updateState({ bpmn: bpmn });

        const warnings = createMsg("with following warnings:", result.warnings);
        postMessage(MessageType.info, `${result.message} ${warnings}`);

    } catch (error) {
        if (error instanceof ImportWarning) {
            const warnings = createMsg("with following warnings:", error.warnings);
            postMessage(MessageType.error, `${error.message} ${warnings}`);
        } else {
            postMessage(MessageType.error, `${error}`);
        }
    }
}

function getFiles(data: FolderContent[] | undefined) {
    function createAndSendMsg(...args: number[]) {
        const msg = `Files set:
              - Configs: ${args[0] ?? 0}
              - Element Templates: ${args[1] ?? 0}
              - Forms: ${args[2] ?? 0}`;
        postMessage(MessageType.info, msg);
    }

    if (data) {
        const [configs, elTemps, forms] = contentController.getFiles(data);
        createAndSendMsg(configs.length, elTemps.length, forms.length);
        return [configs, elTemps, forms];
    } else {
        createAndSendMsg();
        return [[], [], []];
    }
}

async function sendChanges() {
    if (isUpdateFromExtension) {
        isUpdateFromExtension = false; // reset
        return;
    }

    const bpmn = await contentController.exportDiagram();
    stateController.updateState({ bpmn });
    postMessage(MessageType.updateFromWebview, bpmn);
}

function setupListeners() {
    window.addEventListener("message", async (event) => {
        const message = event.data;
        switch (message.type) {
            case `bpmn-modeler.${MessageType.undo}`:
            case `bpmn-modeler.${MessageType.redo}`:
            case `bpmn-modeler.${MessageType.updateFromExtension}`: {
                isUpdateFromExtension = true;
                updateXML(message.text);
                break;
            }
            case `FileSystemWatcher.${MessageType.reloadFiles}`: {
                const [, elTemps] = getFiles(JSON.parse(message.text));
                const loader = modeler.get("elementTemplatesLoader");
                loader.setTemplates(elTemps);
                break;
            }
        }
    });

    // todo this is probably not the right error handling
    modeler.on("elementTemplates.errors", (event) => {
        const { errors } = event;
        //console.log("[Webview] error", errors);
        postMessage(MessageType.error, createMsg("Failed to load element templates with following errors:", errors));
    });

    modeler.get("eventBus").on("commandStack.changed", sendChanges);
}

function postMessage(type: MessageType, msg: string) {
    vscode.postMessage({
        type: `bpmn-modeler.${type}`,
        content: `[Miranum.Modeler.Webview] ${msg}`,
    });
}

window.onload = function () {
    // todo send initial message from extension to set xml
    postMessage(MessageType.info, "Webview was loaded successfully.");
};

function init() {
    const state = stateController.getState();
    if (!state) {
        postMessage(MessageType.error, "[Miranum.Modeler.Webview] State is undefined!");
        return;
    }

    openXML(state.bpmn);
    setupListeners();

    const data = state.files ? JSON.parse(state.files) : undefined;
    const [, elTemps] = getFiles(data);
    modeler.get("elementTemplatesLoader").setTemplates(elTemps);

    //console.log(modeler.get("eventBus")); // list all events

}

init();
