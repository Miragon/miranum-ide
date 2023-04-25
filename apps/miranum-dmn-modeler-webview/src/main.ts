import { MessageType, ModelerData } from "./types/types";
import { ContentController, ImportWarning, instanceOfModelerData, StateController } from "./app";
import { debounce } from "lodash";

// dmn-js
import DmnModeler, { ErrorArray, WarningArray } from "dmn-js/lib/Modeler";

import {
    DmnPropertiesPanelModule,
    DmnPropertiesProviderModule,
} from "dmn-js-properties-panel";
import camundaModdleDescriptors from "camunda-dmn-moddle/resources/camunda.json";

// css
import "./styles.css";
import "dmn-js/dist/assets/diagram-js.css";
import "dmn-js/dist/assets/dmn-js-decision-table.css";
import "dmn-js/dist/assets/dmn-js-drd.css";
import "dmn-js/dist/assets/dmn-js-literal-expression.css";
import "dmn-js/dist/assets/dmn-js-shared.css";
import "dmn-js-properties-panel/dist/assets/properties-panel.css";

const modeler = new DmnModeler({
    drd: {
        propertiesPanel: {
            parent: "#js-properties-panel",
        },
        additionalModules: [
            DmnPropertiesPanelModule,
            DmnPropertiesProviderModule,
        ],
    },
    container: "#js-canvas",
    keyboard: {
        bindTo: document,
    },
    moddleExtensions: {
        camunda: camundaModdleDescriptors,
    },
});

const stateController = new StateController();
const contentController = new ContentController(modeler);

let isUpdateFromExtension = false;

const updateXML = asyncDebounce(openXML, 100);
async function openXML(dmn: string | undefined) {
    try {
        let result: ImportWarning;
        if (!dmn) {
            result = (await contentController.newDiagram());
        } else {
            result = (await contentController.loadDiagram(dmn));
        }
        stateController.updateState({ data: { dmn } });

        const warnings = (result.warnings.length > 0) ? `with following warnings: ${createList(result.warnings)}` : "";
        postMessage(MessageType.info,  undefined, `${result.message} ${warnings}`);

    } catch (error) {
        if (error instanceof ImportWarning) {
            const warnings = (error.warnings.length > 0) ? `with following warnings: ${createList(error.warnings)}` : "";
            postMessage(MessageType.error, undefined, `${error.message} ${warnings}`);
        } else {
            const message = (error instanceof Error) ? error.message : "Failed to open xml.";
            postMessage(MessageType.error, undefined, message);
        }
    }
}

async function sendChanges() {
    if (isUpdateFromExtension) {
        isUpdateFromExtension = false; // reset
        return;
    }

    const dmn = await contentController.exportDiagram();
    stateController.updateState({ data: { dmn } });
    postMessage(MessageType.updateFromWebview, { dmn }, undefined);
}

function setupListeners(): void {
    window.addEventListener("message", (event) => {
        try {
            const message = event.data;
            switch (message.type) {
                case `dmn-modeler.${MessageType.initialize}`: {
                    initialize(message.data);
                    break;
                }
                case `dmn-modeler.${MessageType.restore}`: {
                    initialize(message.data);
                    break;
                }
                case `dmn-modeler.${MessageType.undo}`:
                case `dmn-modeler.${MessageType.redo}`:
                case `dmn-modeler.${MessageType.updateFromExtension}`: {
                    isUpdateFromExtension = true;
                    updateXML(message.data.dmn);
                    break;
                }
            }
        } catch (error) {
            const message = (error instanceof Error) ? error.message : "Could not handle message";
            postMessage(MessageType.error, undefined, message);
        }
    });

    // console.log(modeler.get("eventBus"));
    // modeler.get("eventBus");//.on("commandStack.changed", sendChanges);

    postMessage(MessageType.info, undefined, "Listeners are set.");
}

function init(dmn: string | undefined): void {
    openXML(dmn);
    postMessage(MessageType.info, undefined, "Webview was initialized.");
}

window.onload = async function () {
    try {
        const state = stateController.getState();
        if (state && state.data) {
            postMessage(MessageType.restore, undefined, "State was restored successfully.");
            let dmn = state.data.dmn;
            const newData = await initialized();    // await the response form the backend
            if (instanceOfModelerData(newData)) {
                // we only get new data when the user made changes while the webview was destroyed
                if (newData.dmn) {
                    dmn = newData.dmn;
                }
            }
            return init(dmn);
        } else {
            postMessage(MessageType.initialize, undefined, "Webview was loaded successfully.");
            const data = await initialized();    // await the response form the backend
            if (instanceOfModelerData(data)) {
                return init(data.dmn);
            }
        }
    } catch (error) {
        const message = (error instanceof Error) ? error.message : "Failed to initialize webview.";
        postMessage(MessageType.error, undefined, message);
    }
};

setupListeners();

// ----------------------------- Helper Functions ----------------------------->
/**
 * Create a list of information that will be sent to the backend and get logged.
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
 * Depending on the type of message it contains either data or a string which is only logged
 * @param type A string that represents the type of the message.
 * @param data
 * @param message
 */
function postMessage(type: MessageType, data?: ModelerData, message?: string): void {
    switch (type) {
        case MessageType.updateFromWebview: {
            stateController.postMessage({
                type: `dmn-modeler.${type}`,
                data,
            });
            break;
        }
        default: {
            stateController.postMessage({
                type: `dmn-modeler.${type}`,
                message,
            });
            break;
        }
    }
}

/**
 * A promise that will resolve if initialize() is called.
 */
function initialized() {
    return new Promise((resolve) => {
        initialize = (response: ModelerData | undefined) => { resolve(response); };
    });
}
let initialize: any = null;

/**
 * Makes the [lodash.debounce](https://lodash.com/docs/4.17.15#debounce) function async-friendly
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
