import {
    ContentController,
    ImportWarning,
    instanceOfModelerData,
    setFormKeys,
} from "./app";
import { debounce, reverse, uniqBy } from "lodash";
import { FolderContent, MessageType, StateController } from "@miranum-ide/vscode/miranum-vscode-webview";
import { ModelerData } from "@miranum-ide/vscode/shared/miranum-modeler";

// bpmn-js
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
import miragonProviderModule from "./app/PropertieProvider/provider";
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
        miragonProviderModule,
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

const stateController = new StateController<ModelerData>();
const contentController = new ContentController(modeler);

let isUpdateFromExtension = false;

const updateXML = asyncDebounce(openXML, 100);
async function openXML(bpmn: string | undefined) {
    try {
        let result: ImportWarning;
        if (!bpmn) {
            result = await contentController.newDiagram();
        } else {
            result = await contentController.loadDiagram(bpmn);
        }
        stateController.updateState({ data: { bpmn } });

        const warnings =
            result.warnings.length > 0
                ? `with following warnings: ${createList(result.warnings)}`
                : "";
        postMessage(MessageType.INFO, undefined, `${result.message} ${warnings}`);
    } catch (error) {
        if (error instanceof ImportWarning) {
            const warnings =
                error.warnings.length > 0
                    ? `with following warnings: ${createList(error.warnings)}`
                    : "";
            postMessage(MessageType.ERROR, undefined, `${error.message} ${warnings}`);
        } else {
            const message =
                error instanceof Error ? error.message : "Failed to open xml.";
            postMessage(MessageType.ERROR, undefined, message);
        }
    }
}

/**
 * Set/Update the given files.
 * @param folders
 */
function setFiles(folders: FolderContent[] | undefined): void {
    if (!folders) {
        return;
    }

    const message: string[] = ["Files were set:"];
    // right now we only care about element templates and forms
    for (const folder of folders) {
        switch (folder.type) {
            case "element-template": {
                modeler.get("elementTemplatesLoader").setTemplates(folder.files);
                stateController.updateState({
                    data: {
                        additionalFiles: [{ type: folder.type, files: folder.files }],
                    },
                });
                message.push(`\t\t\t- Element Templates: ${folder.files.length}`);
                break;
            }
            case "form": {
                setFormKeys(folder.files as string[]);
                stateController.updateState({
                    data: {
                        additionalFiles: [{ type: folder.type, files: folder.files }],
                    },
                });
                message.push(`\t\t\t- Forms: ${folder.files.length}`);
                break;
            }
        }
    }

    postMessage(MessageType.INFO, undefined, message.join("\n"));
}

async function sendChanges() {
    if (isUpdateFromExtension) {
        isUpdateFromExtension = false; // reset
        return;
    }

    const bpmn = await contentController.exportDiagram();
    stateController.updateState({ data: { bpmn } });
    postMessage(MessageType.UPDATEFROMWEBVIEW, { bpmn }, undefined);
}

function setupListeners(): void {
    window.addEventListener("message", (event) => {
        try {
            const message = event.data;
            switch (message.type) {
                case `bpmn-modeler.${MessageType.INITIALIZE}`: {
                    initialize(message.data);
                    break;
                }
                case `bpmn-modeler.${MessageType.RESTORE}`: {
                    initialize(message.data);
                    break;
                }
                case `bpmn-modeler.${MessageType.UNDO}`:
                case `bpmn-modeler.${MessageType.REDO}`:
                case `bpmn-modeler.${MessageType.UPDATEFROMEXTENSION}`: {
                    isUpdateFromExtension = true;
                    updateXML(message.data.bpmn);
                    break;
                }
                case `FileSystemWatcher.${MessageType.RELOADFILES}`: {
                    setFiles(message.files);
                    break;
                }
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Could not handle message";
            postMessage(MessageType.ERROR, undefined, message);
        }
    });

    modeler.on("elementTemplates.errors", (event) => {
        const { errors } = event;
        postMessage(
            MessageType.ERROR,
            undefined,
            `Failed to load element templates with following errors: ${createList(
                errors,
            )}`,
        );
    });

    modeler.get("eventBus").on("commandStack.changed", sendChanges);

    postMessage(MessageType.INFO, undefined, "Listeners are set.");
}

function init(bpmn: string | undefined, files: FolderContent[] | undefined): void {
    openXML(bpmn);
    setFiles(files);
    postMessage(MessageType.INFO, undefined, "Webview was initialized.");
}

window.onload = async function () {
    try {
        const state = stateController.getState();
        if (state && state.data) {
            postMessage(
                MessageType.RESTORE,
                undefined,
                "State was restored successfully.",
            );
            let bpmn = state.data.bpmn;
            let files = state.data.additionalFiles;
            const newData = await initialized(); // await the response form the backend
            if (instanceOfModelerData(newData)) {
                // we only get new data when the user made changes while the webview was destroyed
                if (newData.bpmn) {
                    bpmn = newData.bpmn;
                }
                if (newData.additionalFiles) {
                    if (!files) {
                        files = newData.additionalFiles;
                    } else {
                        // replace old values with new ones
                        files = reverse(
                            uniqBy(
                                reverse(files.concat(newData.additionalFiles)),
                                "type",
                            ),
                        );
                    }
                }
            }
            return init(bpmn, files);
        } else {
            postMessage(
                MessageType.INITIALIZE,
                undefined,
                "Webview was loaded successfully.",
            );
            const data = await initialized(); // await the response form the backend
            if (instanceOfModelerData(data)) {
                return init(data.bpmn, data.additionalFiles);
            }
        }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to initialize webview.";
        postMessage(MessageType.ERROR, undefined, message);
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
        case MessageType.UPDATEFROMWEBVIEW: {
            stateController.postMessage({
                type: `bpmn-modeler.${type}`,
                data,
            });
            break;
        }
        default: {
            stateController.postMessage({
                type: `bpmn-modeler.${type}`,
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
        initialize = (response: ModelerData | undefined) => {
            resolve(response);
        };
    });
}
let initialize: any = null;

/**
 * Makes the [lodash.debounce](https://lodash.com/docs/4.17.15#debounce) function async-friendly
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 */
function asyncDebounce<F extends (...args: any[]) => Promise<any>>(
    func: F,
    wait?: number,
) {
    const resolveSet = new Set<(p: any) => void>();
    const rejectSet = new Set<(p: any) => void>();

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

    return (...args: Parameters<F>): ReturnType<F> =>
        new Promise((resolve, reject) => {
            resolveSet.add(resolve);
            rejectSet.add(reject);
            debounced(args);
        }) as ReturnType<F>;
}
// <---------------------------- Helper Functions ------------------------------
