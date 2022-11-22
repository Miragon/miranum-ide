import * as vscode from "vscode";
import { Artifact, createDigiwfLib, DigiWFDeploymentPlugin, DigiwfDeploymentPluginRest, DigiwfLib} from "@miragon-process-ide/digiwf-lib";

const ws = vscode.workspace;
const fs = ws.fs;

export async function initDigiwfLib(): Promise<DigiwfLib> {
    const processIdeJSON = await fs.readFile(vscode.Uri.joinPath(vscode.Uri.file(ws.rootPath ?? ""), "process-ide.json"));

    if (!processIdeJSON) {
        return new DigiwfLib();
    }

    const processIdeConfig = JSON.parse(processIdeJSON.toString());
    const plugins: DigiWFDeploymentPlugin[] = [];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    processIdeConfig.deployment.forEach(p => {
        plugins.push(new DigiwfDeploymentPluginRest(p.plugin, p.targetEnvironments));
    });
    return createDigiwfLib(processIdeConfig.projectVersion, processIdeConfig.name, processIdeConfig.workspace, plugins);
}

export async function getArtifact(path: vscode.Uri): Promise<Artifact> {
    const content = (await fs.readFile(path)).toString();
    const file = path.fsPath.substring(path.fsPath.lastIndexOf('/')+1).split('.');
    return {
        "type": file[1],
        "project": "test" ?? "",     //should be the actual project-name
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
                artifacts.push(...(await getArtifacts(filePath)));
            } else {
                //only form and bpmn
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

export function fileDeploymentSupported(artifact: Artifact): boolean {
    return artifact.type === "form" || artifact.type === "bpmn" || artifact.type === "config" || artifact.type === "dmn";
}
