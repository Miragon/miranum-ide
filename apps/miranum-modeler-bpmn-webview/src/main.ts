// bpmn.js
import { ImportXMLResult } from "bpmn-js/lib/BaseViewer";
// css
import "./styles/default.css";

import {
    asyncDebounce,
    BpmnFileQuery,
    BpmnModelerSettingQuery,
    Command,
    createResolver,
    ElementTemplatesQuery,
    formatErrors,
    FormKeysQuery,
    GetBpmnFileCommand,
    GetBpmnModelerSettingCommand,
    GetDiagramAsSVGCommand,
    GetElementTemplatesCommand,
    GetFormKeysCommand,
    LogErrorCommand,
    LogInfoCommand,
    NoModelerError,
    Query,
    SyncDocumentCommand,
} from "@miranum-ide/vscode/miranum-vscode-webview";
import {
    alignElementsToOrigin,
    createModeler,
    exportDiagram,
    getDiagramSvg,
    getVsCodeApi,
    loadDiagram,
    newDiagram,
    onCommandStackChanged,
    setElementTemplates,
    setForms,
    setSettings,
    UnsupportedEngineError,
} from "./app";

const vscode = getVsCodeApi();

/**
 * Debounce the update of the XML content to avoid too many updates.
 * @param bpmn
 * @throws NoModelerError if the modeler is not available
 */
const debouncedUpdateXML = asyncDebounce(openXml, 100);

// create resolver to wait for the response from the backend
const bpmnFileResolver = createResolver<BpmnFileQuery>();

let modelerIsInitialized = false;

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

    const bpmnFileQuery = await bpmnFileResolver.wait();
    await initializeModeler(bpmnFileQuery?.content, bpmnFileQuery?.engine);
    modelerIsInitialized = true;

    console.debug("[DEBUG] Modeler is initialized...");

    vscode.postMessage(new GetFormKeysCommand());
    vscode.postMessage(new GetElementTemplatesCommand());
    vscode.postMessage(new GetBpmnModelerSettingCommand());
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
        onCommandStackChanged(sendXmlChanges);
        await openXml(bpmn);
    } catch (error: any) {
        if (error instanceof NoModelerError) {
            vscode.postMessage(new LogErrorCommand(error.message));
        } else if (error instanceof UnsupportedEngineError) {
            vscode.postMessage(new LogErrorCommand(error.message));
        } else {
            vscode.postMessage(
                new LogErrorCommand(`Unable to open XML\n${error.message}`),
            );
        }
    }
}

/**
 * Open or update the modeler with the new XML content.
 * @param bpmn
 * @throws NoModelerError if the modeler is not available
 */
async function openXml(bpmn?: string) {
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
async function sendXmlChanges() {
    const bpmn = await exportDiagram();
    vscode.postMessage(new SyncDocumentCommand(bpmn));
    alignElementsToOrigin();
}

/**
 * Listen to messages from the backend.
 */
async function onReceiveMessage(message: MessageEvent<Query | Command>) {
    const queryOrCommand = message.data;
    const errorPreFix = "Error receiving message" + queryOrCommand.type;

    switch (true) {
        case queryOrCommand.type === "BpmnFileQuery": {
            try {
                const bpmnFileQuery = message.data as BpmnFileQuery;
                if (modelerIsInitialized) {
                    await debouncedUpdateXML(bpmnFileQuery.content);
                } else {
                    bpmnFileResolver.done(bpmnFileQuery);
                }
            } catch (error: any) {
                vscode.postMessage(new LogErrorCommand(errorPreFix + error.message));
            }
            break;
        }
        case queryOrCommand.type === "FormKeysQuery": {
            try {
                const formKeys = (message.data as FormKeysQuery).formKeys;
                setForms(formKeys);
            } catch (error: any) {
                vscode.postMessage(new LogErrorCommand(errorPreFix + error.message));
            }
            break;
        }
        case queryOrCommand.type === "ElementTemplatesQuery": {
            try {
                const elementTemplates = (message.data as ElementTemplatesQuery)
                    .elementTemplates;
                setElementTemplates(elementTemplates);
            } catch (error: any) {
                vscode.postMessage(new LogErrorCommand(errorPreFix + error.message));
            }
            break;
        }
        case queryOrCommand.type === "BpmnModelerSettingQuery": {
            try {
                const setting = (message.data as BpmnModelerSettingQuery).setting;
                setSettings(setting);
            } catch (error: any) {
                vscode.postMessage(new LogErrorCommand(errorPreFix + error.message));
            }
            break;
        }
        case queryOrCommand.type === "GetDiagramAsSVGCommand": {
            try {
                const command = message.data as GetDiagramAsSVGCommand;
                command.svg = await getDiagramSvg();
                // Send the SVG back to vscode
                vscode.postMessage(command);
            } catch (error: any) {
                vscode.postMessage(new LogErrorCommand(errorPreFix + error.message));
            }
        }
    }
}
