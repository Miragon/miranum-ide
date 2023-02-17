import * as vscode from "vscode";
import {Artifact, MiranumCore} from "@miranum-ide/miranum-core";

const ws = vscode.workspace;
const fs = ws.fs;

export class Deployment {

    constructor(private digiwfLib: MiranumCore) {}

    public async getArtifact(path: vscode.Uri): Promise<Artifact> {
        const content = (await fs.readFile(path)).toString();
        const file = path.fsPath.substring(path.fsPath.lastIndexOf("/") + 1).split(".");

        return {
            //type = extension => .json has to be renamed
            "type": file[1],
            "project": this.digiwfLib.projectConfig?.name ?? "",
            "file": {
                "content": content,
                "extension": file[1],
                "name": file[0]
            }
        };
    }

    public async getArtifacts(path: vscode.Uri): Promise<Artifact[]> {
        const artifacts: Artifact[] = [];
        const files = await fs.readDirectory(path);
        try {
            for (const file of files) {
                const filePath = vscode.Uri.file(path.fsPath + "/" + file[0]);
                if (file[1] !== 1) {
                    //going through sub-folders
                    artifacts.push(...(await this.getArtifacts(filePath)));
                } else {
                    artifacts.push(await this.getArtifact(filePath));
                }
            }
            return artifacts;
        } catch (err) {
            console.log(err);
            return Promise.reject();
        }
    }
}
