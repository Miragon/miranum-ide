import {
    commands,
    ConfigurationChangeEvent,
    Disposable,
    Range,
    TextDocument,
    TextDocumentChangeEvent,
    WebviewPanel,
    workspace,
    WorkspaceEdit,
} from "vscode";
import { singleton } from "tsyringe";

import { getContext } from "@miranum-ide/vscode/miranum-vscode";
import {
    BpmnFileQuery,
    BpmnModelerSettingQuery,
    DmnFileQuery,
    ElementTemplatesQuery,
    FormKeysQuery,
    MiranumModelerCommand,
    MiranumModelerQuery,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import {
    blockChangeDocumentEvent,
    bpmnEditorUi,
    dmnModelerHtml,
} from "../helper/vscode";
import {
    BpmnUiOutPort,
    DmnUiOutPort,
    DocumentOutPort,
} from "../../application/ports/out";
import { NoChangesToApplyError } from "../../application/errors";
import { BpmnModelerSetting } from "../../application/model";

type ActiveEditor = {
    id: string;
    ui: WebviewPanel;
    document: TextDocument;
};

let activeEditor: ActiveEditor | undefined;
let counterActiveEditor = 0;
const disposables: Map<string, Disposable[]> = new Map();

export function createEditor(
    viewType: string,
    editorId: string,
    webviewPanel: WebviewPanel,
    document: TextDocument,
): WebviewPanel {
    const panel = createWebview(viewType, webviewPanel);
    activeEditor = {
        id: editorId,
        ui: panel,
        document,
    };
    disposables.set(editorId, []);
    updateActiveEditorCounter(++counterActiveEditor);
    return panel;
}

export function createWebview(
    viewType: string,
    webviewPanel: WebviewPanel,
): WebviewPanel {
    const webview = webviewPanel.webview;
    webview.options = { enableScripts: true };

    if (viewType === "miranum-bpmn-modeler") {
        webview.html = bpmnEditorUi(webview, getContext().extensionUri);
    } else if (viewType === "miranum-dmn-modeler") {
        webview.html = dmnModelerHtml(webview, getContext().extensionUri);
    } else {
        throw new Error(`Unsupported file extension: ${viewType}`);
    }

    return webviewPanel;
}

export function setActiveEditor(
    id: string,
    webviewPanel: WebviewPanel,
    document: TextDocument,
) {
    activeEditor = {
        id,
        ui: webviewPanel,
        document,
    };
}

export function addToDisposals(editorId: string, disposable: Disposable) {
    const subscriptions = disposables.get(editorId);

    if (subscriptions) {
        subscriptions.push(disposable);
    } else {
        disposables.set(editorId, [disposable]);
    }
}

// TODO: Is there a better pattern to subscribe to events?
export function subscribeToDisposeEvent() {
    const id = getActiveEditor().id;
    const panel = getActiveEditor().ui;
    const d = disposables.get(id);
    getActiveEditor().ui.onDidDispose(() => disposeEditor(id, panel), null, d);
}

export function subscribeToMessageEvent(
    callback: (message: MiranumModelerCommand, editorId: string) => void,
) {
    const id = getActiveEditor().id;
    const d = disposables.get(id);
    getActiveEditor().ui.webview.onDidReceiveMessage(
        (e: any) => {
            callback(e, getActiveEditor().id);
        },
        null,
        d,
    );
}

export function subscribeToDocumentChangeEvent(
    callback: (event: TextDocumentChangeEvent) => void,
): void {
    const id = getActiveEditor().id;
    const d = disposables.get(id);
    workspace.onDidChangeTextDocument(callback, null, d);
}

export function subscribeToSettingChangeEvent(
    callback: (event: ConfigurationChangeEvent, editorId: string) => void,
) {
    const id = getActiveEditor().id;
    const d = disposables.get(id);
    workspace.onDidChangeConfiguration(
        (e) => {
            callback(e, getActiveEditor().id);
        },
        null,
        d,
    );
}

export function subscibeToEditorChangeEvent() {
    const id = getActiveEditor().id;
    const panel = getActiveEditor().ui;
    const document = getActiveEditor().document;
    getActiveEditor().ui.onDidChangeViewState(() => {
        if (panel.active) {
            setActiveEditor(id, panel, document);
        }
    });
}

@singleton()
export class VsCodeBpmnWebviewAdapter implements BpmnUiOutPort {
    getId(): string {
        return getActiveEditor().id;
    }

    async displayBpmnFile(
        editorId: string,
        executionPlatform: "c7" | "c8",
        bpmnFile: string,
    ): Promise<boolean> {
        const bpmnFileQuery = new BpmnFileQuery(bpmnFile, executionPlatform);
        return postMessage(editorId, bpmnFileQuery);
    }

    async setElementTemplates(
        editorId: string,
        elementTemplates: string[],
    ): Promise<boolean> {
        const elementTemplatesQuery = new ElementTemplatesQuery(elementTemplates);
        return postMessage(editorId, elementTemplatesQuery);
    }

    async setFormKeys(editorId: string, formKeys: string[]): Promise<boolean> {
        const formKeysQuery = new FormKeysQuery(formKeys);
        return postMessage(editorId, formKeysQuery);
    }

    async setSettings(editorId: string, setting: BpmnModelerSetting): Promise<boolean> {
        const webviewSettingsQuery = new BpmnModelerSettingQuery({
            alignToOrigin: setting.alignToOrigin,
        });
        return postMessage(editorId, webviewSettingsQuery);
    }
}

@singleton()
export class VsCodeDmnWebviewAdapter implements DmnUiOutPort {
    getId(): string {
        return getActiveEditor().id;
    }

    async displayDmnFile(editorId: string, dmnFile: string): Promise<boolean> {
        const dmnFileQuery = new DmnFileQuery(dmnFile);
        return postMessage(editorId, dmnFileQuery);
    }
}

@singleton()
export class VsCodeDocumentAdapter implements DocumentOutPort {
    getId(): string {
        return getActiveEditor().id;
    }

    getContent(): string {
        return getActiveEditor().document.getText();
    }

    getFilePath(): string {
        return getActiveEditor().document.uri.path;
    }

    write(content: string): Promise<boolean> {
        if (getActiveEditor().document.getText() === content) {
            throw new NoChangesToApplyError(getActiveEditor().id);
        }

        blockChangeDocumentEvent(true);

        const edit = new WorkspaceEdit();

        edit.replace(
            getActiveEditor().document.uri,
            new Range(0, 0, getActiveEditor().document.lineCount, 0),
            content,
        );

        return Promise.resolve(workspace.applyEdit(edit));
    }
}

function getActiveEditor(): ActiveEditor {
    if (!activeEditor) {
        throw new Error("No active editor.");
    }
    return activeEditor;
}

async function postMessage(
    editorId: string,
    message: MiranumModelerCommand | MiranumModelerQuery,
): Promise<boolean> {
    if (getActiveEditor().id !== editorId) {
        throw new Error("The given editor id does not match the active editor.");
    }
    return getActiveEditor().ui.webview.postMessage(message);
}

function disposeEditor(editorId: string, panel: WebviewPanel) {
    panel.dispose();
    const subscriptions = disposables.get(editorId);
    subscriptions?.forEach((subscription) => subscription.dispose());
    disposables.delete(editorId);

    updateActiveEditorCounter(--counterActiveEditor);

    if (activeEditor?.id === editorId) {
        activeEditor = undefined;
    }
}

function updateActiveEditorCounter(counter: number) {
    commands.executeCommand("setContext", `miranum-modeler.openCustomEditors`, counter);
}
