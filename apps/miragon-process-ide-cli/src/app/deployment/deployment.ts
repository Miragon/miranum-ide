import {DigiwfLib, FileDetails, getSupportedTypes} from "@miragon-process-ide/digiwf-lib";
import { getFile, getFiles } from "../shared/fs";
import * as colors from "colors";

export class Deployment {

    constructor(private digiwfLib: DigiwfLib) {}

    public async deployArtifact(path: string, type: string, project: string | undefined, target: string): Promise<void> {
        const file = await getFile(path);
        return await this.deployFile(file, type, project, target);
    }

    public async deployAllArtifacts(path: string, project: string | undefined, target: string): Promise<void> {
        const files = await getFiles(path);
        for (const file of files) {
            try {
                let type = file.extension.replace(".", "").toLowerCase();
                if (type === "json") {
                    path.includes("schema.json") ? type = "form" : type = "config";
                }
                await this.deployFile(file, type, project, target);
            } catch (err) {
                console.log(colors.red.bold("FAILED ") + `deploying ${file.name} with -> ${err}`);
            }
        }
    }


    //Helpers//
    private async deployFile(file: FileDetails, type: string, project: string | undefined, target: string): Promise<void> {
        //blacklisting invalid artifact-types
        if (!getSupportedTypes().includes(type.toLowerCase())) {
            console.log(colors.red.bold("ERROR: ") + `${type} is not supported for deployment`);
            return Promise.reject(`${type} is not supported for deployment`);
        }
        const artifact = await this.digiwfLib.deploy(target, {
            "type": type,
            "project": project ?? "",
            "file": file
        });
        console.log(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + target);
    }
}
