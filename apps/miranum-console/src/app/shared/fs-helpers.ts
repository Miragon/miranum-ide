import {
    Artifact,
    createMiranumCore,
    MiranumCore,
    MiranumDeploymentPlugin,
    MiranumDeploymentPluginRest,
    MiranumDeploymentTarget
} from "@miranum-ide/miranum-core";
import * as vscode from "vscode";
import { GenerateProjectMessage } from "../generate/types";
import { showErrorMessage } from "../shared/message";


const fs = vscode.workspace.fs;

export async function initMiranumCore() : Promise<MiranumCore> {
    try {
        const ws = vscode.workspace;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const miranumJSON = JSON.parse((await ws.fs.readFile(vscode.Uri.joinPath(ws.workspaceFolders[0].uri, "miranum.json"))).toString());
        const plugins : MiranumDeploymentPlugin[] = [];
        miranumJSON.deployment.forEach((p: { plugin: string; targetEnvironments: MiranumDeploymentTarget[]; }) => {
            plugins.push(new MiranumDeploymentPluginRest(p.plugin, p.targetEnvironments));
        });
        return createMiranumCore(miranumJSON.projectVersion, miranumJSON.name, miranumJSON.workspace, plugins);
    } catch (e) {
        // lightweight initialization of MiranumCore. It may not support all features (e.g. deployment)
        return new MiranumCore();
    }
}

export async function saveFile(destination: string, fileContent: string): Promise<void> {
    const folderPath = vscode.Uri.file(destination.substring(0, destination.lastIndexOf("/")));
    try {
        await fs.readFile(folderPath);
    } catch {
        await fs.createDirectory(folderPath);
    }
    await fs.writeFile(vscode.Uri.file(destination), new TextEncoder().encode(fileContent));
}

// TODO refactor this method
// it should push into event store and trigger a new event
/* eslint-disable  @typescript-eslint/no-explicit-any */
export function openFilePicker(window: any, userInputCache: GenerateProjectMessage, sendProjectMessage: any) {
    window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
    }).then( (fileUri: { path: string; }[]) => {
        if (fileUri) {
            userInputCache.path = fileUri[0].path;
            sendProjectMessage();
        } else {
            showErrorMessage("Could not find selected Uri, please try again");
        }
    });
}

export async function getArtifact(path: vscode.Uri, projectName?: string): Promise<Artifact> {
    const content = (await fs.readFile(path)).toString();
    const file = path.fsPath.substring(path.fsPath.lastIndexOf("/") + 1).split(".");

    return {
        //type = extension => .json has to be renamed
        "type": file[1],
        "project": projectName ?? "",
        "file": {
            "content": content,
            "extension": file[1],
            "name": file[0]
        }
    };
}

export async function getArtifacts(path: vscode.Uri, projectName?: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const files = await fs.readDirectory(path);
    try {
        for (const file of files) {
            const filePath = vscode.Uri.file(path.fsPath + "/" + file[0]);
            if (file[1] !== 1) {
                //going through sub-folders
                artifacts.push(...(await getArtifacts(filePath, projectName)));
            } else {
                artifacts.push(await getArtifact(filePath, projectName));
            }
        }
        return artifacts;
    } catch (err) {
        console.log(err);
        return Promise.reject();
    }
}
