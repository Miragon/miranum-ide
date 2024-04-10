import {
    commands,
    Range,
    TextDocument,
    TextDocumentChangeEvent,
    ViewColumn,
    WebviewPanel,
    window,
    workspace,
    WorkspaceEdit,
} from "vscode";
import { container, singleton } from "tsyringe";

import {
    clearDisposables,
    getContext,
    getDisposables,
    NoChangesToApplyError,
} from "@miranum-ide/vscode/miranum-vscode";
import {
    Command,
    JsonFormQuery,
    Query,
    SettingQuery,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import { formBuilderUi, formPreviewUi } from "../helper/vscode";
import {
    DocumentOutPort,
    FormBuilderUiOutPort,
    FormPreviewUiOutPort,
} from "../../application/ports/out";

type ActiveEditor = {
    id: string;
    ui: WebviewPanel;
    document: TextDocument;
};

let activeEditor: ActiveEditor | undefined;
let preview: WebviewPanel | undefined;
let counterActiveEditor = 0;

export function createEditor(
    viewType: string,
    editorId: string,
    formBuilderPanel: WebviewPanel,
    document: TextDocument,
): WebviewPanel {
    const panel = createWebview(viewType, formBuilderPanel);
    activeEditor = {
        id: editorId,
        ui: panel,
        document,
    };
    updateActiveEditorCounter(++counterActiveEditor);
    return panel;
}

/**
 * Creates a preview webview panel.
 * @param viewType
 * @returns The created webview panel.
 * @throws {Error} If the given editor id does not match the active editor.
 */
export function createPreview(viewType: string): WebviewPanel {
    preview = createWebview(
        viewType,
        window.createWebviewPanel(viewType, "Preview", {
            viewColumn: ViewColumn.Beside,
            preserveFocus: true,
        }),
    );

    return getPreview();
}

function createWebview(viewType: string, webviewPanel: WebviewPanel): WebviewPanel {
    const webview = webviewPanel.webview;
    webview.options = { enableScripts: true };

    if (viewType === container.resolve("FormBuilderViewType")) {
        webview.html = formBuilderUi(webview, getContext().extensionUri);
    } else if (viewType === container.resolve("FormPreviewViewType")) {
        webview.html = formPreviewUi(webview, getContext().extensionUri);
    } else {
        throw new Error(`Unsupported file extension: ${viewType}`);
    }

    return webviewPanel;
}

function setActiveEditor(
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

// TODO: Is there a better pattern to subscribe to events?
export function subscribeToDisposeEvent() {
    const id = getActiveEditor().id;
    const editorPanel = getActiveEditor().ui;
    const d = getDisposables(id);
    getActiveEditor().ui.onDidDispose(() => disposeEditor(id, editorPanel), null, d);
}

export function subscribeToMessageEvent(
    callback: (message: Command, editorId: string) => void,
) {
    const id = getActiveEditor().id;
    const d = getDisposables(id);
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
    const d = getDisposables(id);
    workspace.onDidChangeTextDocument(callback, null, d);
}

/**
 * Subscribes to the active editor tab change event.
 * When the active editor tab changes, the active editor is updated.
 * @throws {Error} If the preview is not set.
 */
export function subscribeToTabChangeEvent(updatePreview: () => void) {
    const id = getActiveEditor().id;
    const panel = getActiveEditor().ui;
    const document = getActiveEditor().document;
    getActiveEditor().ui.onDidChangeViewState(() => {
        if (panel.active) {
            setActiveEditor(id, panel, document);
            updatePreview();
        }
    });
}

@singleton()
export class VsCodeFormBuilderWebviewAdapter implements FormBuilderUiOutPort {
    getId(): string {
        return getActiveEditor().id;
    }

    async display(editorId: string, jsonForm: string): Promise<boolean> {
        const jsonFormQuery = new JsonFormQuery(jsonForm);

        if (await postMessage(editorId, getActiveEditor().ui, jsonFormQuery)) {
            return true;
        } else {
            throw new Error("Failed to send schema and uischema to the webview.");
        }
    }
}

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

        const edit = new WorkspaceEdit();

        edit.replace(
            getActiveEditor().document.uri,
            new Range(0, 0, getActiveEditor().document.lineCount, 0),
            content,
        );

        console.debug("write");

        return Promise.resolve(workspace.applyEdit(edit));
    }
}

@singleton()
export class VsCodeFormPreviewWebviewAdapter implements FormPreviewUiOutPort {
    getId(): string {
        return getActiveEditor().id;
    }

    async display(jsonForm: string, renderer: string): Promise<boolean> {
        const jsonFormQuery = new JsonFormQuery(jsonForm);
        const settingQuery = new SettingQuery(renderer);

        const [jsonFormSuccess, rendererSuccess] = await Promise.all([
            postMessage(this.getId(), getPreview(), jsonFormQuery),
            postMessage(this.getId(), getPreview(), settingQuery),
        ]);

        if (jsonFormSuccess && rendererSuccess) {
            return true;
        } else {
            if (!jsonFormSuccess) {
                throw new Error("Failed to send schema and uischema to the webview.");
            } else {
                throw new Error("Failed to send renderer to the webview.");
            }
        }
    }

    async setSetting(renderer: string): Promise<boolean> {
        const settingQuery = new SettingQuery(renderer);

        if (await postMessage(this.getId(), getPreview(), settingQuery)) {
            return true;
        } else {
            throw new Error("Failed to send renderer to the webview.");
        }
    }
}

/**
 * Posts a message to the active editor webview.
 * @param editorId
 * @param webviewPanel
 * @param message
 * @returns `true` if the message was sent successfully.
 * @throws {Error} If the given editor id does not match the active editor.
 * @throws {Error} If the active editor is hidden and `retainContextWhenHidden` is not set.
 * @throws {Error} If the message could not be sent to the webview.
 */
async function postMessage(
    editorId: string,
    webviewPanel: WebviewPanel,
    message: Command | Query,
): Promise<boolean> {
    if (!webviewPanel) {
        throw new Error("The webview panel is not set.");
    }
    if (getActiveEditor().id !== editorId) {
        throw new Error("The given editor id does not match the active editor.");
    }
    if (!webviewPanel.options.retainContextWhenHidden) {
        // If `retainContextWhenHidden` is not set, messages can only be sent to visible webviews.
        if (!webviewPanel.visible) {
            throw new Error("The active editor is hidden.");
        }
    }
    if (await webviewPanel.webview.postMessage(message)) {
        return true;
    } else {
        throw new Error("Failed to send message to the webview.");
    }
}

function getActiveEditor(): ActiveEditor {
    if (!activeEditor) {
        throw new Error("No active editor.");
    }
    return activeEditor;
}

function getPreview(): WebviewPanel {
    if (!preview) {
        throw new Error("No preview.");
    }
    return preview;
}

function updateActiveEditorCounter(counter: number) {
    commands.executeCommand("setContext", `miranum-modeler.openCustomEditors`, counter);
}

function disposeEditor(editorId: string, panel: WebviewPanel) {
    panel.dispose();
    const subscriptions = getDisposables(editorId);
    subscriptions?.forEach((subscription) => subscription.dispose());
    clearDisposables(editorId);

    updateActiveEditorCounter(--counterActiveEditor);

    if (activeEditor?.id === editorId) {
        activeEditor = undefined;
    }
}
