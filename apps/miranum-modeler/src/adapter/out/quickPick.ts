import { window } from "vscode";
import { singleton } from "tsyringe";

import { GetExecutionPlatformVersionOutPort } from "../../application/ports/out";

@singleton()
export class VsCodeQuickPickAdapter implements GetExecutionPlatformVersionOutPort {
    async getExecutionPlatformVersion() {
        const result = await window.showQuickPick(["Camunda 7", "Camunda 8"], {
            placeHolder: "Select the execution platform version",
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
