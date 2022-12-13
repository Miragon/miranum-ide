import * as vscode from "vscode";
import * as colors from "colors";
import { Artifact } from "@miragon-process-ide/digiwf-lib";

const fs = vscode.workspace.fs;

export async function generate(artifact: Artifact, path: string): Promise<void> {
    try {
        if (!artifact.file.pathInProject) {
            const msg = `Could not create file ${artifact.file.name}`;
            vscode.window.showInformationMessage(colors.red.bold("FAILED ") + msg);
            return Promise.reject(msg);
        }
        await saveFile(path, artifact.file.pathInProject, artifact.file.content);

        let fileName = artifact.file.pathInProject;
        fileName = fileName.includes("/") ? fileName.slice(fileName.indexOf("/")+1) : fileName;
        vscode.window.showInformationMessage(colors.green.bold("SAVED ") + fileName);
    } catch (err) {
        vscode.window.showInformationMessage(colors.red.bold("FAILED ") + ` creating file ${artifact.file.name} with -> ${err}`);
        return Promise.reject(err);
    }
}

//     -----------------------------HELPERS-----------------------------     \\
export async function saveFile(projectDir: string, pathInProject: string, fileContent: string): Promise<void> {
    const file = `${projectDir}/${pathInProject}`.replace("//", "/")
    const path = vscode.Uri.file(file.substring(0, file.lastIndexOf("/")));
    try {
        await fs.readFile(path);
    } catch {
        await fs.createDirectory(path);
    }
    await fs.writeFile(vscode.Uri.file(file), new TextEncoder().encode(fileContent));
}
