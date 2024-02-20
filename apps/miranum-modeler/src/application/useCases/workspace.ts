import { inject, singleton } from "tsyringe";

import { FilePathCommand, SetConfigInPort } from "../ports/in";
import {
    ReadMiranumJsonOutPort,
    ShowMessageOutPort,
    VsCodeReadOutPort,
    WorkspaceOutPort,
} from "../ports/out";
import { NoMiranumJsonFoundError } from "../errors";

@singleton()
export class ReadMiranumJsonUseCase implements SetConfigInPort {
    private readonly name = "miranum.json";

    constructor(
        @inject("MiranumWorkspaceOutPort")
        private readonly miranumWorkspaceOutPort: WorkspaceOutPort,
        @inject("VsCodeReadOutPort")
        private readonly vsCodeReadOutPort: VsCodeReadOutPort,
        @inject("ReadMiranumJsonOutPort")
        private readonly readMiranumJsonOutPort: ReadMiranumJsonOutPort,
        @inject("ShowMessageOutPort")
        private readonly showMessageOutPort: ShowMessageOutPort,
    ) {}

    async setMiranumJson(setConfigCommand: FilePathCommand) {
        const workspace = this.miranumWorkspaceOutPort.getWorkspacePath();
        try {
            const miranumJsonPath = await this.searchMiranumJsonFiles(
                setConfigCommand.path,
                workspace,
            );
            const result =
                await this.readMiranumJsonOutPort.readMiranumJson(miranumJsonPath);
            if (result === "workspace") {
                this.showMessageOutPort.showInfoMessage(
                    `Workspace is set (${workspace}).`,
                );
            } else {
                this.showMessageOutPort.showInfoMessage(
                    `Default workspace is used. You can save element templates in \`${workspace}/element-templates\` and forms in \`${workspace}/forms\`.`,
                );
            }
        } catch (error) {
            if (error instanceof NoMiranumJsonFoundError) {
                this.showMessageOutPort.showErrorMessage(
                    `The \`miranum.json\` file is missing.\nDefault workspace is used. You can save element templates in \`${workspace}/element-templates\` and forms in \`${workspace}/forms\`.`,
                );
            } else if (error instanceof SyntaxError) {
                this.showMessageOutPort.showErrorMessage(
                    `The \`miranum.json\` file has incorrect JSON.\nDefault workspace is used. You can save element templates in \`${workspace}/element-templates\` and forms in \`${workspace}/forms\`.`,
                );
            } else {
                this.showMessageOutPort.showErrorMessage(
                    `Something went wrong!\nDefault workspace is used. You can save element templates in \`${workspace}/element-templates\` and forms in \`${workspace}/forms\`.`,
                );
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
