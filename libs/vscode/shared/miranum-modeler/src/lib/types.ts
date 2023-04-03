import { FolderContent } from "@miranum-ide/vscode/miranum-vscode-webview";

export interface ModelerData {
    bpmn?: string;
    additionalFiles?: FolderContent[]; // e.g element templates, forms
}
