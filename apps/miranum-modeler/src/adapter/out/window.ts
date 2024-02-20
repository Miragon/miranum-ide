import { window } from "vscode";
import { singleton } from "tsyringe";

import { ShowMessageOutPort } from "../../application/ports/out";

@singleton()
export class VsCodeShowMessageAdapter implements ShowMessageOutPort {
    showInfoMessage(message: string): void {
        window.showInformationMessage(message);
    }

    showErrorMessage(message: string): void {
        window.showErrorMessage(message);
    }
}
