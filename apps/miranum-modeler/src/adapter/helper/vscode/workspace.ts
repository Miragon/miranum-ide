import { TextDocument, TextDocumentChangeEvent, workspace } from "vscode";
import { FilePathCommand } from "../../../application/ports/in";

let document: TextDocument | undefined;

let miranumWorkspacePath: string | undefined;

// ====================================== Document =====================================>
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

// <===================================== Document ======================================
//
// ===================================== Workspace ====================================>
export function setWorkspace(filePathCommand: FilePathCommand): void {
    const path = filePathCommand.path;
    const workspaces = workspace.workspaceFolders;

    if (!workspaces) {
        miranumWorkspacePath = path;
        return;
    }

    const miranumWorkspaces = workspaces
        .map((workspace) => {
            if (path.startsWith(workspace.uri.path)) {
                return workspace.uri.path;
            }
            return undefined;
        })
        .filter((workspace): workspace is string => !!workspace);

    switch (miranumWorkspaces.length) {
        case 0:
            miranumWorkspacePath = path;
            break;
        case 1:
            miranumWorkspacePath = miranumWorkspaces[0];
            break;
        default:
            // get the string with the longest length
            miranumWorkspacePath = miranumWorkspaces.reduce((prev, curr) =>
                prev.length > curr.length ? prev : curr,
            );
    }
}

export function getWorkspacePath(): string {
    return getWorkspace();
}

function getWorkspace(): string {
    if (!miranumWorkspacePath) {
        throw new Error("No workspace set.");
    }

    return miranumWorkspacePath;
}

// <==================================== Workspace =====================================
