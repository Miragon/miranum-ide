import { digiwfDeploymentPluginRest } from "@miragon-process-ide/digiwf-deployment-plugin-rest";
import { getFile, getFiles } from "./read-fs";
import { Artifact } from "./types";

export function digiwfLib(): string {
    const plugins = digiwfDeploymentPluginRest();
    console.log(plugins);
    return "digiwf-lib";
}


export async function deployArtifact(path: string, type: string, project: string | undefined, target: string): Promise<Artifact> {
    const file = await getFile(path);

    return {
        "type": file.extension.replace(".", "").toUpperCase(),
        "project": project ?? "",
        "path": path,
        "file": file
    };
}

export async function deployAllArtifacts(path: string, project: string | undefined, target: string): Promise<Artifact[]> {
    const files = await getFiles(path);

    return files.map(file => {
        return {
            "type": file.extension.replace(".", "").toUpperCase(),
            "project": project ?? "",
            "path": path,
            "file": file
        }
    });
}
