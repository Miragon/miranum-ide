import { reverse, uniqBy } from "lodash";
import {
    asyncDebounce,
    FolderContent,
    MessageType,
    VsCode,
    VsCodeImpl,
    VsCodeMock,
} from "@miranum-ide/vscode/miranum-vscode-webview";
import { ExecutionPlatformVersion, ModelerData } from "@miranum-ide/vscode/shared/miranum-modeler";
import { ExtendElementTemplates } from "@miranum-ide/miranum-create-append-c7-element-templates";
import { ContentController, createResolver, instanceOfModelerData, setFormKeys } from "./app";
// bpmn.js
import Modeler from "camunda-bpmn-js/lib/base/Modeler";
import BpmnModeler7 from "camunda-bpmn-js/lib/camunda-platform/Modeler";
import BpmnModeler8 from "camunda-bpmn-js/lib/camunda-cloud/Modeler";
import { ImportXMLResult } from "bpmn-js/lib/BaseViewer";
import { CreateAppendElementTemplatesModule } from "bpmn-js-create-append-anything";
import TokenSimulationModule from "bpmn-js-token-simulation";
import ElementTemplateChooserModule from "@bpmn-io/element-template-chooser";
import miragonProviderModule from "./app/PropertieProvider/provider";
// css
import "./styles.css";
import "camunda-bpmn-js/dist/assets/camunda-platform-modeler.css";
import "camunda-bpmn-js/dist/assets/camunda-cloud-modeler.css";
import "bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css";
import "@bpmn-io/element-template-chooser/dist/element-template-chooser.css";

//
// Global objects
//
declare const process: { env: { NODE_ENV: string } };
declare const globalViewType: string;

let modeler: Modeler;
let contentController: ContentController;

let vscode: VsCode<ModelerData>;
if (process.env.NODE_ENV === "development") {
    const response: ModelerData = {
        executionPlatformVersion: ExecutionPlatformVersion.Camunda8,
        bpmn: undefined,
        additionalFiles: [],
    };
    vscode = new VsCodeMock(globalViewType, response);
} else {
    vscode = new VsCodeImpl<ModelerData>();
}

let isUpdateFromExtension = false;
const updateXML = asyncDebounce(openXML, 100);

//
// Logic
//

const resolver = createResolver();

// Listen to messages from the backend/extension
setupListeners();

/**
 * The Main function that gets executed after the webview is fully loaded.
 * This way we can ensure that when the backend sends a message, it is caught.
 * There are two reasons why a webview gets build:
 * 1. A new .bpmn file was opened
 * 2. User switched to another tab and now switched back
 */
window.onload = async function () {
    try {
        const state = vscode.getState();
        if (state && state.data) {
            // User switched back to the tab with this webview
            postMessage(
                MessageType.RESTORE,
                undefined,
                "State was restored successfully.",
            );

            let bpmn = state.data.bpmn;
            let files = state.data.additionalFiles;

            const newData = await resolver.wait(); // await the response form the backend
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
            return init(bpmn, files, state.data.executionPlatformVersion);
        } else {
            // A new .bpmn file was opened
            postMessage(
                MessageType.INITIALIZE,
                undefined,
                "Webview was loaded successfully.",
            );

            const data = await resolver.wait(); // await the response form the backend
            if (instanceOfModelerData(data)) {
                return init(
                    data.bpmn,
                    data.additionalFiles,
                    data.executionPlatformVersion,
                );
            }
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : `${error}`;
        postMessage(
            MessageType.ERROR,
            undefined,
            `Something went wrong when initializing the webview!\n${message}`,
        );
    }
};

/**
 * Set the initial data after the webview was loaded.
 * @param bpmn
 * @param files
 * @param executionPlatformVersion
 */
function init(
    bpmn: string | undefined,
    files: FolderContent[] | undefined,
    executionPlatformVersion: ExecutionPlatformVersion | undefined,
): void {
    if (executionPlatformVersion === undefined) {
        postMessage(MessageType.ERROR, undefined, "ExecutionPlatformVersion undefined!");
        return;
    }
    modeler = createBpmnModeler(executionPlatformVersion);
    setupBpmnModelerListener();

    contentController = new ContentController(modeler);
    vscode.updateState({ data: { executionPlatformVersion } });

    openXML(bpmn);
    setFiles(files);

    postMessage(MessageType.INFO, undefined, "Webview was initialized.");
}

/**
 * Open or update the modeler with the new XML content.
 * @param bpmn
 */
async function openXML(bpmn: string | undefined) {
    try {
        let result: ImportXMLResult;
        if (!bpmn) {
            result = await contentController.newDiagram();
        } else {
            result = await contentController.loadDiagram(bpmn);
        }
        vscode.updateState({ data: { bpmn } });

        if (result.warnings.length > 0) {
            const warnings = `with following warnings: ${createErrorList(
                result.warnings,
            )}`;
            postMessage(MessageType.INFO, undefined, warnings);
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : `${error}`;
        postMessage(
            MessageType.ERROR,
            undefined,
            `Unable to open/update XML\n${message}`,
        );
    }
}

/**
 * Set or update the given files.
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
                modeler.get<any>("elementTemplatesLoader").setTemplates(folder.files);
                vscode.updateState({
                    data: {
                        additionalFiles: [{ type: folder.type, files: folder.files }],
                    },
                });
                message.push(`\t\t\t- Element Templates: ${folder.files.length}`);
                break;
            }
            case "form": {
                setFormKeys(folder.files as string[]);
                vscode.updateState({
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

/**
 * Send the changed XML content to the backend to update the .bpmn file.
 */
async function sendChanges() {
    if (isUpdateFromExtension) {
        isUpdateFromExtension = false; // reset
        return;
    }

    const bpmn = await contentController.exportDiagram();
    vscode.updateState({ data: { bpmn } });
    postMessage(MessageType.MSGFROMWEBVIEW, { bpmn }, undefined);
}

/**
 * Setup modeler specific event listener.
 */
function setupBpmnModelerListener() {
    modeler.on("elementTemplates.errors", (event: any) => {
        const { errors } = event;
        postMessage(
            MessageType.ERROR,
            undefined,
            `Failed to load element templates with following errors: ${createErrorList(
                errors,
            )}`,
        );
    });

    modeler.get<any>("eventBus").on("commandStack.changed", sendChanges);
}

/**
 * Listen to messages from the backend.
 */
function setupListeners(): void {
    window.addEventListener("message", (event) => {
        try {
            const message = event.data;
            switch (message.type) {
                case `${globalViewType}.${MessageType.INITIALIZE}`: {
                    resolver.done(message.data);
                    break;
                }
                case `${globalViewType}.${MessageType.RESTORE}`: {
                    resolver.done(message.data);
                    break;
                }
                case `${globalViewType}.${MessageType.UNDO}`:
                case `${globalViewType}.${MessageType.REDO}`:
                case `${globalViewType}.${MessageType.MSGFROMEXTENSION}`: {
                    isUpdateFromExtension = true;
                    updateXML(message.data.bpmn);
                    break;
                }
                case `${globalViewType}.${MessageType.ALIGN}`: {
                    const alignToOrigin = modeler.get<any>("alignToOrigin");
                    if (alignToOrigin) {
                        alignToOrigin.align();
                    }
                    break;
                }
                case `FileSystemWatcher.${MessageType.RELOADFILES}`: {
                    setFiles(message.files);
                    break;
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : `${error}`;
            postMessage(
                MessageType.ERROR,
                undefined,
                `Unable to process message!\n${message}`,
            );
        }
    });
}

// ----------------------------- Helper Functions ----------------------------->
/**
 * Post a message to the extension.
 * Depending on the type of message it contains either data or a string which is only logged
 * @param type A string that represents the type of the message.
 * @param data
 * @param message
 */
function postMessage(type: MessageType, data?: ModelerData, message?: string): void {
    switch (type) {
        case MessageType.MSGFROMWEBVIEW: {
            vscode.postMessage({
                type: `${globalViewType}.${type}`,
                data,
            });
            break;
        }
        default: {
            vscode.postMessage({
                type: `${globalViewType}.${type}`,
                message,
            });
            break;
        }
    }
}

/**
 * Create the modeler depending on the XML.
 * @param executionPlatformVersion
 */
function createBpmnModeler(executionPlatformVersion: ExecutionPlatformVersion): Modeler {
    let bpmnModeler;
    const commonModules = [TokenSimulationModule, ElementTemplateChooserModule];

    switch (executionPlatformVersion) {
        case ExecutionPlatformVersion.None:
        case ExecutionPlatformVersion.Camunda7: {
            bpmnModeler = new BpmnModeler7({
                container: "#js-canvas",
                propertiesPanel: {
                    parent: "#js-properties-panel",
                },
                alignToOrigin: {
                    alignOnSave: false,
                    offset: 150,
                    tolerance: 50,
                },
                additionalModules: [
                    ...commonModules,
                    ExtendElementTemplates,
                    CreateAppendElementTemplatesModule,
                    miragonProviderModule,
                ],
            });
            break;
        }
        case ExecutionPlatformVersion.Camunda8: {
            bpmnModeler = new BpmnModeler8({
                container: "#js-canvas",
                alignToOrigin: {
                    alignOnSave: false,
                    offset: 150,
                    tolerance: 50,
                },
                propertiesPanel: {
                    parent: "#js-properties-panel",
                },
                additionalModules: [...commonModules],
            });
            break;
        }
    }

    return bpmnModeler;
}

/**
 * Create a list of information that will be sent to the backend and get logged.
 * @param messages A list of further information.
 */
function createErrorList(messages: string[]): string {
    let msg = "";
    if (messages && messages.length > 0) {
        for (const message of messages) {
            msg += `\n- ${message}`;
        }
    }
    return msg;
}

// <---------------------------- Helper Functions ------------------------------
