import { Artifact, DigiwfLib } from "@miragon-process-ide/digiwf-lib";
import { saveFile } from "../shared/fs";
import * as colors from "colors";

export class ProjectGenerator {

    constructor(private digiwfLib: DigiwfLib) {}

    public async generateProject(name: string, path: string): Promise<void>  {
        const artifacts = await this.digiwfLib.initProject(name);
        for (const artifact of artifacts) {
            await this.generate(artifact, path);
        }
    }

    public async generateFile(name: string, type: string, path: string, templateBase?: string, additionalData?: object): Promise<void> {
        const artifact = await this.digiwfLib.generateArtifact(name, type, "");
        await this.generate(artifact, path);
    }

    private async generate(artifact: Artifact, path: string): Promise<void> {
        try {
            if (!artifact.file.pathInProject) {
                const msg = `Could not create file ${artifact.file.name}`;
                console.log(colors.red.bold("FAILED ") + msg);
                return Promise.reject(msg);
            }
            await saveFile(path, artifact.file.pathInProject, artifact.file.content);
            console.log(colors.green.bold("SAVED ") + artifact.file.pathInProject.substring(1, artifact.file.pathInProject.length));
        } catch (err) {
            console.log(colors.red.bold("FAILED ") + ` creating file ${artifact.file.name} with -> ${err}`);
            return Promise.reject(err);
        }
    }

}
