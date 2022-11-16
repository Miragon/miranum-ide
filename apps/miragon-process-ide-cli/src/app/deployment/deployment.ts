import { DigiwfLib } from "@miragon-process-ide/digiwf-lib";
import { getFile, getFiles } from "../shared/fs";
import * as colors from "colors";

export class Deployment {

    constructor(private digiwfLib: DigiwfLib) {}

    public async deployArtifact(path: string, type: string, project: string | undefined, target: string): Promise<void> {
        const file = await getFile(path);
        //blacklisting everything that isn't supported
        if(type != "form" && type != "bpmn" && type != "dmn") {
            console.log(colors.red.bold("ERROR: ") + `${type} is not supported for deployment`);
            return;
        }
        const artifact = await this.digiwfLib.deploy(target, {
            "type": type,
            "project": project ?? "",
            "file": file
        });
        console.log(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + target);
    }

    public async deployAllArtifacts(path: string, project: string | undefined, target: string): Promise<void> {
        const files = await getFiles(path);
        for (const file of files) {
            try {
                let type = file.extension.replace(".", "").toLowerCase();
                if (type === "json") {
                    path.includes("schema.json") ? type = "form" : type = "config";
                }

                //await this.deployArtifact(`${path}/${file.pathInProject}`, type, project ?? "", target);  //wäre schöner, hat aber probleme mit dem filepath

                //blacklisting everything that isn't supported
                if(type != "form" && type != "bpmn" && type != "dmn") {
                    console.log(colors.red.bold("ERROR: ") + `${type} is not supported for deployment`);
                    continue;
                }
                const artifact = {
                    "type": type,
                    "project": project ?? "",
                    "file": file
                }
                await this.digiwfLib.deploy(target, artifact);
                console.log(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + target);
            } catch (err) {
                console.log(colors.red.bold("FAILED ") + `deploying ${file.name} with -> ${err}`);
            }
        }
    }
}
