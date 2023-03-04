import { FolderContent, MessageType } from "./types/VsCode";
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

const stateController = new StateController();
const contentController = new ContentController(modeler);

let isUpdateFromExtension = false;


const updateXML = asyncDebounce(openXML, 100);
async function openXML(bpmn: string | undefined) {
    try {
        let result: ImportWarning;
        if (!bpmn) {
            result = (await contentController.newDiagram());
        } else {
            result = (await contentController.loadDiagram(bpmn));
        }
        stateController.updateState({ bpmn });

        const warnings = (result.warnings.length > 0) ? `with following warnings: ${createList(result.warnings)}` : "";
        postMessage(MessageType.info, `${result.message} ${warnings}`);

    } catch (error) {
        if (error instanceof ImportWarning) {
            const warnings = (error.warnings.length > 0) ? `with following warnings: ${createList(error.warnings)}` : "";
            postMessage(MessageType.error, `${error.message} ${warnings}`);
        } else {
            postMessage(MessageType.error, `${error}`);
        }
    }
}

function getFiles(data: FolderContent[] | undefined) {
    function createAndSendMsg(...args: number[]) {
        const msg = `Files are set:
            - Configs: ${args[0] ?? 0}
            - Element Templates: ${args[1] ?? 0}
            - Forms: ${args[2] ?? 0}`;
        postMessage(MessageType.info, msg);
    }

    if (data) {
        const [configs, elTemps, forms] = contentController.getFiles(data);
        stateController.updateState({ files: JSON.stringify(data) });
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

function setupListeners(): void {
    window.addEventListener("message", (event) => {
        try {
            const message = event.data;
            switch (message.type) {
                case `bpmn-modeler.${MessageType.initialize}`: {
                    initialize(message.text);
                    break;
                }
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
        } catch (error) {
            const message = (error instanceof Error) ? error.message : "Could not handle message";
            postMessage(MessageType.error, message);
        }
    });

    modeler.on("elementTemplates.errors", (event) => {
        const { errors } = event;
        postMessage(MessageType.error, `Failed to load element templates with following errors: ${createList(errors)}`);
    });

    modeler.get("eventBus").on("commandStack.changed", sendChanges);

    postMessage(MessageType.info, "Listeners are set.");
}

function init(bpmn: string | undefined, files: FolderContent[] | undefined): void {
    openXML(bpmn);
    const [, elTemps] = getFiles(files);
    modeler.get("elementTemplatesLoader").setTemplates(elTemps);

    postMessage(MessageType.info, "Webview was initialized.");
}

/**
 * Send initialize webview when it is loaded.
 */
window.onload = async function () {
    setupListeners();
    try {
        const state = stateController.getState();
        if (state) {
            postMessage(MessageType.info, "State was restored successfully.");
            const data = state.files ? JSON.parse(state.files) : undefined;
            return init(state.bpmn, data);
        } else {
            postMessage(MessageType.initialize, "Webview was loaded successfully.");
            const rawData = await initialized();
            if (typeof rawData === "string") {
                const data = JSON.parse(rawData);
                return init(data.bpmn, data.files);
            }
        }
    } catch (error) {
        const message = (error instanceof Error) ? error.message : "Failed to initialize webview.";
        postMessage(MessageType.error, message);
    }
};


// ----------------------------- Helper Functions ----------------------------->
/**
 * Create the content of a message.
 * @param messages A list of further information.
 */
function createList(messages: ErrorArray | WarningArray): string {
    let msg = "";
    if (messages && messages.length > 0) {
        for (const message of messages) {
            msg += `\n- ${message.message}`;
        }
    }
    return msg;
}

/**
 * Post a message to the extension.
 * @param type A string that represents the type of the message.
 * @param content
 */
function postMessage(type: MessageType, content: string): void {
    switch (type) {
        case MessageType.updateFromWebview: {
            stateController.postMessage({
                type: `bpmn-modeler.${type}`,
                content,
            });
            break;
        }
        default: {
            stateController.postMessage({
                type: `bpmn-modeler.${type}`,
                content: `[Miranum.Modeler.Webview] ${content}`,
            });
            break;
        }
    }
}

/**
 * A promise that will resolve if another function is called.
 */
function initialized() {
    // this promise resolves when initialize() is called!
    return new Promise((resolve) => {
        initialize = (response: string) => { resolve(response); };
    });
}
let initialize: any = null;

/**
 * Makes the debounce function async-friendly
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 */
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
// <---------------------------- Helper Functions ------------------------------
