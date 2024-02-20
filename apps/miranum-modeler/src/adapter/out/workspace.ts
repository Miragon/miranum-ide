import { singleton } from "tsyringe";

import { getContent, getFilePath, getWorkspacePath } from "../helper/vscode";
import { DocumentOutPort, WorkspaceOutPort } from "../../application/ports/out";

@singleton()
export class MiranumWorkspaceAdapter implements WorkspaceOutPort {
    getWorkspacePath(): string {
        return getWorkspacePath();
    }
}

@singleton()
export class MiranumDocumentAdapter implements DocumentOutPort {
    getContent(): string {
        return getContent();
    }

    getFilePath(): string {
        return getFilePath();
    }
}
