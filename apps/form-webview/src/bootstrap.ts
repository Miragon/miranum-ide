import { FormEditor } from "@bpmn-io/form-js-editor";
import { Form } from "@bpmn-io/form-js-viewer";
import {
    Command,
    createFlushResponder,
    FlushDocumentQuery,
    FormFileQuery,
    FormInputValuesQuery,
    GetFormFileCommand,
    GetFormInputValuesCommand,
    Query,
    ReleaseDocumentFlushQuery,
} from "@miragon/bpmn-modeler-shared";

import { FormEditorApp } from "./app/FormEditorApp";
import { FORM_TEMPLATE } from "./app/formTemplate";
import type { FormHost, WebviewState } from "./app/host";
import { shouldHandleHostMessage } from "./app/hostMessage";

function requiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing form webview element: ${id}`);
    return element as T;
}

/** Seeds the state on a first-ever open, so the editor's later `updateState` calls cannot throw. */
function initialMode(host: FormHost): WebviewState["mode"] {
    try {
        return host.getState().mode;
    } catch {
        host.setState({ mode: "edit" });
        return "edit";
    }
}

export function bootstrap(host: FormHost): void {
    const container = requiredElement<HTMLElement>("app");
    container.innerHTML = FORM_TEMPLATE;

    const editorElement = requiredElement<HTMLElement>("form-editor");
    const previewElement = requiredElement<HTMLElement>("form-preview");
    const app = new FormEditorApp(
        new FormEditor({ container: editorElement }),
        new Form({ container: previewElement }),
        host,
        {
            editor: editorElement,
            preview: previewElement,
            error: requiredElement("form-error"),
            editButton: requiredElement("edit-view"),
            previewButton: requiredElement("preview-view"),
        },
        initialMode(host),
    );

    const respondToFlush = createFlushResponder(app, (message) => host.postMessage(message));
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void app.flushPendingSync();
    });
    window.addEventListener("message", (event: MessageEvent<Query | Command>) => {
        if (!shouldHandleHostMessage(event)) return;
        if (event.data.type === "FormFileQuery") {
            const query = event.data as FormFileQuery;
            void app.load(query.content, query.documentRevision);
        } else if (event.data.type === "FormInputValuesQuery") {
            void app.setInputValues((event.data as FormInputValuesQuery).content);
        } else if (
            event.data.type === "FlushDocumentQuery" ||
            event.data.type === "ReleaseDocumentFlushQuery"
        ) {
            void respondToFlush(event.data as FlushDocumentQuery | ReleaseDocumentFlushQuery);
        }
    });
    host.postMessage(new GetFormFileCommand());
    host.postMessage(new GetFormInputValuesCommand());
}
