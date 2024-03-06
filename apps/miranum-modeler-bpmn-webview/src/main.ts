// bpmn.js
import { ImportXMLResult } from "bpmn-js/lib/BaseViewer";
// css
import "./styles.css";
import "camunda-bpmn-js/dist/assets/camunda-platform-modeler.css";
import "camunda-bpmn-js/dist/assets/camunda-cloud-modeler.css";
import "bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css";
import "@bpmn-io/element-template-chooser/dist/element-template-chooser.css";

import {
    asyncDebounce,
    BpmnFileQuery,
    BpmnModelerSetting,
    BpmnModelerSettingQuery,
    createResolver,
    ElementTemplatesQuery,
    formatErrors,
    FormKeysQuery,
    GetBpmnFileCommand,
    GetBpmnModelerSettingCommand,
    GetElementTemplatesCommand,
    GetFormKeysCommand,
    LogErrorCommand,
    LogInfoCommand,
    MiranumModelerCommand,
    MiranumModelerQuery,
    NoModelerError,
    SyncDocumentCommand,
} from "@miranum-ide/vscode/miranum-vscode-webview";
import {
    alignElementsToOrigin,
    createModeler,
    exportDiagram,
    getVsCodeApi,
    loadDiagram,
    newDiagram,
    onCommandStackChanged,
    onElementTemplatesErrors,
    setElementTemplates,
    setForms,
    setSettings,
    UnsupportedEngineError,
} from "./app";

const vscode = getVsCodeApi();
let isUpdateFromExtension = false;

/**
 * Debounce the update of the XML content to avoid too many updates.
 * @param bpmn
 * @throws NoModelerError if the modeler is not available
 */
const debouncedUpdateXML = asyncDebounce(openXML, 100);

// create resolver to wait for the response from the backend
const bpmnFileResolver = createResolver<BpmnFileQuery>();
const formKeysResolver = createResolver<FormKeysQuery>();
const elementTemplatesResolver = createResolver<ElementTemplatesQuery>();
const settingResolver = createResolver<BpmnModelerSettingQuery>();

/**
 * The Main function that gets executed after the webview is fully loaded.
 * This way we can ensure that when the backend sends a message, it is caught.
 * There are two reasons why a webview gets build:
 * 1. A new .bpmn file was opened
 * 2. User switched to another tab and now switched back
 */
window.onload = async function () {
    window.addEventListener("message", onReceiveMessage);

    vscode.postMessage(new GetBpmnFileCommand());
    vscode.postMessage(new GetFormKeysCommand());
    vscode.postMessage(new GetElementTemplatesCommand());
    vscode.postMessage(new GetBpmnModelerSettingCommand());

    const bpmnFileQuery = await bpmnFileResolver.wait();
    await initializeModeler(bpmnFileQuery?.content, bpmnFileQuery?.engine);

    const [formKeysQuery, elementTemplatesQuery, settingQuery] = await Promise.all([
        formKeysResolver.wait(),
        elementTemplatesResolver.wait(),
        settingResolver.wait(),
    ]);

    await initializeArtifacts(
        formKeysQuery?.formKeys,
        elementTemplatesQuery?.elementTemplates,
        settingQuery?.setting,
    );
};

async function initializeModeler(
    bpmn: string | undefined,
    engine: "c7" | "c8" | undefined,
) {
    if (!engine) {
        vscode.postMessage(new LogErrorCommand("ExecutionPlatformVersion undefined!"));
        return;
    }

    try {
        createModeler(engine);
        onCommandStackChanged(sendChanges);
        await openXML(bpmn);
    } catch (error: unknown) {
        if (error instanceof NoModelerError) {
            vscode.postMessage(new LogErrorCommand(error.message));
        } else if (error instanceof UnsupportedEngineError) {
            vscode.postMessage(new LogErrorCommand(error.message));
        } else {
            const message = error instanceof Error ? error.message : `${error}`;
            vscode.postMessage(new LogErrorCommand(`Unable to open XML\n${message}`));
        }
    }
}

/**
 * Set the initial data after the webview was loaded.
 * @param formKeys
 * @param elementTemplates
 * @param setting
 */
async function initializeArtifacts(
    formKeys: string[] | undefined,
    elementTemplates: JSON[] | undefined,
    setting: BpmnModelerSetting | undefined,
) {
    try {
        setElementTemplates(elementTemplates);
        onElementTemplatesErrors((errors) =>
            vscode.postMessage(
                new LogErrorCommand(
                    `Failed to load element templates with following errors: ${formatErrors(
                        errors,
                    )}`,
                ),
            ),
        );

        setForms(formKeys);
        setSettings(setting);
    } catch (error: unknown) {
        if (error instanceof NoModelerError) {
            vscode.postMessage(new LogErrorCommand(error.message));
        } else if (error instanceof UnsupportedEngineError) {
            vscode.postMessage(new LogErrorCommand(error.message));
        } else {
            const message = error instanceof Error ? error.message : `${error}`;
            vscode.postMessage(new LogErrorCommand(`Unable to open XML\n${message}`));
        }
    }
}

/**
 * Open or update the modeler with the new XML content.
 * @param bpmn
 * @throws NoModelerError if the modeler is not available
 */
async function openXML(bpmn: string | undefined) {
    let result: ImportXMLResult;
    if (!bpmn) {
        result = await newDiagram();
    } else {
        result = await loadDiagram(bpmn);
    }

    if (result.warnings.length > 0) {
        const warnings = `with following warnings: ${formatErrors(result.warnings)}`;
        vscode.postMessage(new LogInfoCommand(warnings));
    }
}

/**
 * Send the changed XML content to the backend to update the .bpmn file.
 */
async function sendChanges() {
    if (isUpdateFromExtension) {
        isUpdateFromExtension = false; // reset
        return;
    }

    const bpmn = await exportDiagram();
    vscode.postMessage(new SyncDocumentCommand(bpmn));
    alignElementsToOrigin();
}

/**
 * Listen to messages from the backend.
 */
async function onReceiveMessage(
    message: MessageEvent<MiranumModelerQuery | MiranumModelerCommand>,
) {
    const queryOrCommand = message.data;

    try {
        switch (true) {
            case queryOrCommand.type === "BpmnFileQuery": {
                try {
                    const bpmnFileQuery = message.data as BpmnFileQuery;
                    await debouncedUpdateXML(bpmnFileQuery.content);

                    isUpdateFromExtension = true;
                } catch (error: unknown) {
                    if (error instanceof NoModelerError) {
                        bpmnFileResolver.done(message.data as BpmnFileQuery);
                    } else {
                        throw error;
                    }
                }
                break;
            }
            case queryOrCommand.type === "FormKeysQuery": {
                try {
                    const formKeys = (message.data as FormKeysQuery).formKeys;
                    setForms(formKeys);
                } catch (error: unknown) {
                    if (error instanceof NoModelerError) {
                        formKeysResolver.done(message.data as FormKeysQuery);
                    } else {
                        throw error;
                    }
                }
                break;
            }
            case queryOrCommand.type === "ElementTemplatesQuery": {
                try {
                    const elementTemplates = (message.data as ElementTemplatesQuery)
                        .elementTemplates;
                    setElementTemplates(elementTemplates);
                } catch (error: unknown) {
                    if (error instanceof NoModelerError) {
                        elementTemplatesResolver.done(
                            message.data as ElementTemplatesQuery,
                        );
                    } else {
                        throw error;
                    }
                }
                break;
            }
            case queryOrCommand.type === "BpmnModelerSettingQuery": {
                try {
                    const setting = (message.data as BpmnModelerSettingQuery).setting;
                    setSettings(setting);
                } catch (error: unknown) {
                    if (error instanceof NoModelerError) {
                        settingResolver.done(message.data as BpmnModelerSettingQuery);
                    } else {
                        throw error;
                    }
                }
                break;
            }
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : `${error}`;
        vscode.postMessage(
            new LogErrorCommand(
                `Something went wrong when receiving the message ${errorMessage}`,
            ),
        );
    }
}
