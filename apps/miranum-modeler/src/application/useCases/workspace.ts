import { inject, singleton } from "tsyringe";

import { FilePathCommand, SetArtifactsInPort } from "../ports/in";
import {
    MiranumWorkspaceOutPort,
    ReadMiranumJsonOutPort,
    VsCodeReadOutPort,
} from "../ports/out";
import { NoMiranumJsonFoundError } from "../errors";

@singleton()
export class ReadMiranumJsonUseCase implements SetArtifactsInPort {
    private readonly name = "miranum.json";

    constructor(
        @inject("MiranumWorkspaceOutPort")
        private readonly miranumWorkspaceOutPort: MiranumWorkspaceOutPort,
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
        @inject("ReadMiranumJsonOutPort")
        private readonly readMiranumJsonOutPort: ReadMiranumJsonOutPort,
    ) {}

    async setArtifacts(setArtifactCommand: FilePathCommand) {
        const workspace = this.miranumWorkspaceOutPort.getWorkspace();
        try {
            const miranumJsonPath = await this.searchMiranumJsonFiles(
                setArtifactCommand.path,
                workspace,
            );
            const result =
                await this.readMiranumJsonOutPort.readMiranumJson(miranumJsonPath);
            if (result === "workspace") {
                // TODO: Show info message that the workspace is set
            } else {
                // TODO: Show info message that the default configuration is used
            }
        } catch (error) {
            if (error instanceof NoMiranumJsonFoundError) {
                // TODO: Show error message that the default configuration is used
            } else if (error instanceof SyntaxError) {
                // TODO: Show error message that the `miranum.json` file is not valid JSON and the default configuration is used
            } else {
                // TODO: Show error message and that the default configuration is used
            }
        }
    }

    /**
     * This method searches for the `miranum.json` file in the workspace.
     * It starts from the given `searchPath` and goes up the directory tree
     * until it finds the file.
     * @param searchPath is the path to the open `.bpmn` or `.dmn` file
     * @param workspaceRoot is the path to the root of the workspace
     * @throws {NoMiranumJsonFoundError} if the `miranum.json` file is not found
     * @returns the path to the `miranum.json` file
     * @private
     */
    private async searchMiranumJsonFiles(
        searchPath: string,
        workspaceRoot: string,
    ): Promise<string> {
        // 1. If `searchPath` not included in the workspace, throw an error
        if (!searchPath.startsWith(workspaceRoot)) {
            throw new NoMiranumJsonFoundError(workspaceRoot);
        }

        // 2. Get the files of the given `searchPath`
        const dir = await this.vsCodeReadOutPort.readDirectory(searchPath);

        if (dir.find(([name, type]) => name === this.name && type === "file")) {
            // 3. If the `searchPath` contains the `miranum.json` file, return the path to the file
            return `${searchPath}/${this.name}`;
        } else {
            // 4. If the `searchPath` does not contain the `miranum.json` file,
            //    get the parent directory and call the function recursively
            return this.searchMiranumJsonFiles(
                searchPath.split("/").slice(0, -1).join("/"),
                workspaceRoot,
            );
        }
    }
}
