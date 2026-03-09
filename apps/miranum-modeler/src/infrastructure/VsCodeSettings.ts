import { window, workspace } from "vscode";

import { UserCancelledError } from "../domain/errors";

/** VS Code configuration and quick-pick helpers for the BPMN modeler. */
export class VsCodeSettings {
    /**
     * Reads the alignToOrigin setting from VS Code configuration.
     * @returns `true` if align-to-origin is enabled, `false` otherwise.
     */
    getAlignToOrigin(): boolean {
        return (
            workspace
                .getConfiguration("miragon.camundaModeler")
                .get<boolean>("alignToOrigin") ?? false
        );
    }

    /**
     * Shows a quick-pick prompt and returns the selected execution platform key.
     *
     * @param placeHolder Prompt text shown in the quick-pick widget.
     * @param items List of items to display (e.g. ["Camunda 7", "Camunda 8"]).
     * @returns `"c7"` for Camunda 7, `"c8"` for Camunda 8.
     * @throws {Error} If the user cancels or selects an unknown item.
     */
    async getExecutionPlatformVersion(
        placeHolder: string,
        items: string[],
    ): Promise<"c7" | "c8"> {
        const result = await window.showQuickPick(items, {
            placeHolder,
            onDidSelectItem: (item) => item,
        });

        if (result === undefined) {
            throw new UserCancelledError();
        } else if (result === "Camunda 7") {
            return "c7";
        } else if (result === "Camunda 8") {
            return "c8";
        } else {
            throw new Error(`Unknown execution platform version: "${result}"`);
        }
    }
}
