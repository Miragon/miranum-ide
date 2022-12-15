import * as vscode from "vscode";
import { Artifact } from "@miranum-ide/miranum-core";

const fs = vscode.workspace.fs;

export async function generate(artifact: Artifact, path: string): Promise<void> {
    try {
        if (!artifact.file.pathInProject) {
            const msg = `Could not create file ${artifact.file.name}`;
            vscode.window.showInformationMessage("FAILED " + msg);
            return Promise.reject(msg);
        }
        await saveFile(path, artifact.file.pathInProject, artifact.file.content);
        vscode.window.showInformationMessage(`SAVED ${artifact.file.name}.${artifact.file.extension}`);
    } catch (err) {
        vscode.window.showInformationMessage(`FAILED creating file ${artifact.file.name} with -> ${err}`);
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
