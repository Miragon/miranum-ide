import { FolderContent } from "@miranum-ide/miranum-vscode";

export interface ModelerData {
    bpmn?: string;
    additionalFiles?: FolderContent[]; // e.g element templates, forms
}
