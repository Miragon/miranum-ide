import { window } from "vscode";
import { singleton } from "tsyringe";

import { GetExecutionPlatformVersionOutPort } from "../../application/ports/out";

@singleton()
export class VsCodeQuickPickAdapter implements GetExecutionPlatformVersionOutPort {
    async getExecutionPlatformVersion(placeHolder: string, items: string[]) {
        const result = await window.showQuickPick(items, {
            placeHolder,
            onDidSelectItem: (item) => item,
        });

        if (result === "Camunda 7") {
            return "c7";
        } else if (result === "Camunda 8") {
            return "c8";
        } else {
            throw new Error("Unknown execution platform version");
        }
    }
}
