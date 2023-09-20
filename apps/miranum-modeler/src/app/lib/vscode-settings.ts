import { workspace } from "vscode";

let alignToOrigin: boolean | undefined = workspace
    .getConfiguration("miranum-ide.modeler")
    .get("alignToOrigin");

workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("miranum-ide.modeler.alignToOrigin")) {
        alignToOrigin = workspace
            .getConfiguration("miranum-ide.modeler")
            .get("alignToOrigin");
    }
});

export function getAlignToOrigin(): boolean {
    if (!alignToOrigin) {
        return false;
    }
    return alignToOrigin;
}
