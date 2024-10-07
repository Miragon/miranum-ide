import {
    checkIfSupportedType,
    FileDetails,
    MiranumCore,
} from "@miranum-ide/miranum-core";
import { getFile, getFiles } from "../shared/fs";
import * as colors from "colors";

export class Deployment {
    constructor(private miranumCore: MiranumCore) {}

    public async deployArtifact(
        path: string,
        type: string,
        target: string,
    ): Promise<void> {
        const file = await getFile(path);
        return this.deploy(file, type, target);
    }

    public async deployAllArtifacts(path: string, target: string): Promise<void> {
        const files: { type: string; file: FileDetails }[] = [];
        if (!this.miranumCore.projectConfig) {
            throw new Error(path + " is not a valid project!");
        }

        for (const workspace of this.miranumCore.projectConfig.workspace) {
            if (!checkIfSupportedType(workspace.type)) {
                continue;
            }
            try {
                (
                    await getFiles(
                        `${path}/${workspace.path}`.replace("//", "/"),
                        workspace.extension,
                    )
                ).forEach((f) => files.push({ type: workspace.type, file: f }));
            } catch (error) {
                // continue if workspace is not allocated
            }
        }
        for (const file of files) {
            try {
                await this.deploy(file.file, file.type, target);
            } catch (err) {
                console.log(
                    colors.red.bold("FAILED ") +
                        `deploying ${file.file.name} with -> ${err}`,
                );
                // todo the deployment should continue and fail in the end, not here (Übergangslösung)
                return Promise.reject(
                    colors.red.bold("FAILED ") + `deploying Artifacts in ${path}`,
                );
            }
        }
    }

    private async deploy(
        file: FileDetails,
        type: string,
        target: string,
    ): Promise<void> {
        if (!checkIfSupportedType(type)) {
            return Promise.reject(`${type} is not supported for deployment`);
        }
        const artifact = await this.miranumCore.deploy(target, {
            type: type,
            project: this.miranumCore.projectConfig?.name ?? "",
            file: file,
        });
        console.log(
            colors.green.bold("DEPLOYED ") +
                artifact.file.name +
                " to environment " +
                target,
        );
    }
}
