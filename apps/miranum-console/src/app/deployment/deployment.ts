import * as vscode from "vscode";
import {Artifact} from "@miranum-ide/miranum-core";

const ws = vscode.workspace;
const fs = ws.fs;

export async function getArtifact(path: vscode.Uri): Promise<Artifact> {
    const content = (await fs.readFile(path)).toString();
    const file = path.fsPath.substring(path.fsPath.lastIndexOf('/')+1).split('.');

    //using the extension works for bpmn, dmn, form
    let type = file[1];
    //config - ideally look at workspaceConfig
    if(getDirectoryName(path.fsPath) === "configs") {
        type = "config";
    }

    const directory = getDirectoryName(path.fsPath);
    const project = (directory !== "configs" && directory !== "forms" && directory !== "element-templates") ? directory : getDirectoryName(getDirectory(path.fsPath));

    return {
        "type": type,
        "project": project,
        "file": {
            "content": content,
            "extension": file[1],
            "name": file[0]
        }
    };
}

export async function getArtifacts(path: vscode.Uri): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const files = await fs.readDirectory(path);
    try {
        for (const file of files) {
            const filePath = vscode.Uri.file(path.fsPath + "/" + file[0]);
            if(file[1] != 1) {
                //going through sub-folders
                artifacts.push(...(await getArtifacts(filePath)));
            } else {
                artifacts.push(await getArtifact(filePath));
            }
        }
        return artifacts;
    }
    catch (err) {
        console.log(err);
        return Promise.reject();
    }
}

//   ------------------------HELPERS------------------------   \\
function getDirectory(path: string): string {
    return path.substring(0, path.lastIndexOf('/'));
}
function getDirectoryName(path: string): string {
    const tmp = getDirectory(path);
    return tmp.substring(tmp.lastIndexOf('/') + 1);
}
