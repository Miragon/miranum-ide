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
    createResolver,
    ElementTemplatesQuery,
    formatErrors,
    FormKeysQuery,
    GetBpmnFileCommand,
    GetElementTemplatesCommand,
    GetFormKeysCommand,
    GetWebviewSettingCommand,
    LogErrorCommand,
    LogInfoCommand,
    MiranumModelerCommand,
    MiranumModelerQuery,
    MissingStateError,
    NoModelerError,
    SyncDocumentCommand,
    WebviewSetting,
    WebviewSettingQuery,
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
    UnsupportedEngineError,
} from "./app";

const vscode = getVsCodeApi();
let isUpdateFromExtension = false;
const debouncedUpdateXML = asyncDebounce(openXML, 100);

// create resolver to wait for the response from the backend
const bpmnFileResolver = createResolver<BpmnFileQuery>();
const formKeysResolver = createResolver<FormKeysQuery>();
const elementTemplatesResolver = createResolver<ElementTemplatesQuery>();
const configResolver = createResolver<WebviewSettingQuery>();

/**
 * The Main function that gets executed after the webview is fully loaded.
 * This way we can ensure that when the backend sends a message, it is caught.
 * There are two reasons why a webview gets build:
 * 1. A new .bpmn file was opened
 * 2. User switched to another tab and now switched back
 */
window.onload = async function () {
    window.addEventListener("message", onReceiveMessage);

    try {
        const state = vscode.getState();
        const [bpmnFile, engine, formKeys, elementTemplates, setting] = [
            state.bpmnFile,
            state.engine,
            state.formKeys,
            state.elementTemplates,
            state.setting,
        ];
        await init(bpmnFile, engine, formKeys, elementTemplates, setting);
    } catch (error: unknown) {
        if (error instanceof MissingStateError) {
            vscode.postMessage(new GetBpmnFileCommand());
            vscode.postMessage(new GetFormKeysCommand());
            vscode.postMessage(new GetElementTemplatesCommand());
            vscode.postMessage(new GetWebviewSettingCommand());

            const [bpmnFile, formKeys, elementTemplates, setting] = await Promise.all([
                bpmnFileResolver.wait(),
                formKeysResolver.wait(),
                elementTemplatesResolver.wait(),
                configResolver.wait(),
            ]);

            await init(
                bpmnFile?.content,
                bpmnFile?.engine,
                formKeys?.formKeys,
                elementTemplates?.elementTemplates,
                setting?.setting,
            );
        } else {
            const message = error instanceof Error ? error.message : `${error}`;
            vscode.postMessage(
                new LogErrorCommand(
                    `Something went wrong when initializing the webview!\n${message}`,
                ),
            );
        }
    }
};

/**
 * Set the initial data after the webview was loaded.
 * @param bpmnFile
 * @param engine
 * @param formKeys
 * @param elementTemplates
 * @param setting
 */
async function init(
    bpmnFile: string | undefined,
    engine: "c7" | "c8" | undefined,
    formKeys: string[] | undefined,
    elementTemplates: JSON[] | undefined,
    setting: WebviewSetting | undefined,
) {
    if (engine === undefined) {
        vscode.postMessage(new LogErrorCommand("ExecutionPlatformVersion undefined!"));
        return;
    }

    try {
        createModeler(engine);
        onElementTemplatesErrors((errors) =>
            vscode.postMessage(
                new LogErrorCommand(
                    `Failed to load element templates with following errors: ${formatErrors(
                        errors,
                    )}`,
                ),
            ),
        );
        onCommandStackChanged(sendChanges);

        await openXML(bpmnFile);
        setElementTemplates(elementTemplates);
        setForms(formKeys);
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

    vscode.setState({
        bpmnFile: bpmnFile ?? "",
        engine,
        formKeys: formKeys ?? [],
        elementTemplates: elementTemplates ?? [],
        setting: setting ?? { alignToOrigin: false },
    });

    vscode.postMessage(
        new LogInfoCommand(
            `Webview was initialized with ${
                elementTemplates?.length ?? 0
            } element templates and ${formKeys?.length ?? 0} forms.`,
        ),
    );
}

/**
 * Open or update the modeler with the new XML content.
 * @param bpmn
 */
async function openXML(bpmn: string | undefined) {
    try {
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
    } catch (error) {
        if (error instanceof NoModelerError) {
            vscode.postMessage(new LogErrorCommand(error.message));
        } else {
            const message = error instanceof Error ? error.message : `${error}`;
            vscode.postMessage(new LogErrorCommand(`Unable to open XML\n${message}`));
        }
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

    if (vscode.getState().setting.alignToOrigin) {
        alignElementsToOrigin();
    }

    const bpmn = await exportDiagram();
    vscode.updateState({ bpmnFile: bpmn });
    vscode.postMessage(new SyncDocumentCommand(bpmn));
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
                    vscode.updateState({
                        bpmnFile: bpmnFileQuery.content,
                        engine: bpmnFileQuery.engine,
                    });
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
                    vscode.updateState({ formKeys });
                } catch (error: unknown) {
                    if (error instanceof NoModelerError) {
                        formKeysResolver.done(message.data as FormKeysQuery);
                    }
                }
                break;
            }
            case queryOrCommand.type === "ElementTemplatesQuery": {
                try {
                    const elementTemplates = (message.data as ElementTemplatesQuery)
                        .elementTemplates;
                    setElementTemplates(elementTemplates);
                    vscode.updateState({ elementTemplates });
                } catch (error: unknown) {
                    if (error instanceof NoModelerError) {
                        elementTemplatesResolver.done(
                            message.data as ElementTemplatesQuery,
                        );
                    }
                }
                break;
            }
            case queryOrCommand.type === "WebviewConfigQuery": {
                try {
                    vscode.getState();
                    const config = (message.data as WebviewSettingQuery).setting;
                    vscode.updateState({ setting: config });
                } catch (error: unknown) {
                    if (error instanceof MissingStateError) {
                        configResolver.done(message.data as WebviewSettingQuery);
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
