import { TextDocument, TextDocumentChangeEvent, workspace } from "vscode";

let document: TextDocument | undefined;

export function setDocument(newDocument: TextDocument): TextDocument {
    document = newDocument;
    return document;
}

export function getContent(): string {
    return getDocument().getText();
}

export function getFilePath(): string {
    return getDocument().uri.path;
}

export function onDidChangeTextDocument(
    callback: (event: TextDocumentChangeEvent) => void,
): void {
    workspace.onDidChangeTextDocument(callback);
}

function getDocument(): TextDocument {
    if (!document) {
        throw new Error("No document set.");
    }
    return document;
}
