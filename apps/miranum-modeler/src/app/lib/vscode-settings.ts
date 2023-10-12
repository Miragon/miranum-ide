import { workspace } from "vscode";

let alignToOrigin: boolean | undefined = workspace
    .getConfiguration("miranumIDE.modeler")
    .get("alignToOrigin");

workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("miranumIDE.modeler.alignToOrigin")) {
        alignToOrigin = workspace
            .getConfiguration("miranumIDE.modeler")
            .get("alignToOrigin");
    }
});

export function getAlignToOrigin(): boolean {
    if (!alignToOrigin) {
        return false;
    }
    return alignToOrigin;
}
