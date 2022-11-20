import { checkIfSupportedType, DigiwfLib, FileDetails } from "@miragon-process-ide/digiwf-lib";
import { getFile, getFiles } from "../shared/fs";
import * as colors from "colors";

export class Deployment {

    constructor(private digiwfLib: DigiwfLib) {}

    public async deployArtifact(path: string, type: string, target: string): Promise<void> {
        const file = await getFile(path);
        return this.deploy(file, type, target);
    }

    public async deployAllArtifacts(path: string, target: string): Promise<void> {
        const files: { type: string; file: FileDetails; }[] = [];
        const workspace = this.digiwfLib.projectConfig?.workspace;
        for (const key in workspace) {
            switch (key) {
                case "forms":
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    (await getFiles(`${path}/${workspace[key]}`.replace("//", "/"), [".form", ".schema.json"]))
                        .forEach(f => files.push({type: "form", file: f}));
                    break;
                case "processConfigs":
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    (await getFiles(`${path}/${workspace[key]}`.replace("//", "/"), [".json"]))
                        .forEach(f => files.push({type: "form", file: f}));
                    break;
            }
        }
        (await getFiles(path, [".bpmn"]))
            .forEach(f => files.push({type: "bpmn", file: f}));
        (await getFiles(path, [".dmn"]))
            .forEach(f => files.push({type: "dmn", file: f}));
        for (const file of files) {
            try {
                await this.deploy(file.file, file.type, target);
            } catch (err) {
                console.log(colors.red.bold("FAILED ") + `deploying ${file.file.name} with -> ${err}`);
            }
        }
    }

    private async deploy(file: FileDetails, type: string, target: string): Promise<void> {
        if (!checkIfSupportedType(type)) {
            return Promise.reject(`${type} is not supported for deployment`);
        }
        const artifact = await this.digiwfLib.deploy(target, {
            "type": type,
            "project": this.digiwfLib.projectConfig?.name ?? "",
            "file": file
        });
        console.log(colors.green.bold("DEPLOYED ") + artifact.file.name + " to environment " + target);
    }
}
