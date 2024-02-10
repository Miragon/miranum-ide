import { TextDocument, TextDocumentChangeEvent, workspace } from "vscode";

let document: TextDocument | undefined;

export function setDocument(newDocument: TextDocument): TextDocument {
    document = newDocument;
    return document;
}

export function getDocument(): TextDocument {
    if (!document) {
        throw new Error("No document set.");
    }
    return document;
}

export function onDidChangeTextDocument(
    callback: (event: TextDocumentChangeEvent) => void,
): void {
    workspace.onDidChangeTextDocument(callback);
}
