import * as vscode from "vscode";
import { Uri } from "vscode";
import { FolderContent, WorkspaceFolder } from "../types";
import { Logger } from "./Logger";

/**
 * Scan the current working directory for important files.
 */
export class Reader {
    private static instance: Reader;

    private readonly fs = vscode.workspace.fs;

    public static get(): Reader {
        if (this.instance === undefined) {
            this.instance = new Reader();
        }
        return this.instance;
    }

    /**
     * Get all available files.
     */
    public async getAllFiles(rootDir: Uri, workspaceFolders: WorkspaceFolder[]): Promise<FolderContent[]> {
        const promises: Map<string, Promise<JSON[] | string[]>> = new Map();
        for (const folder of workspaceFolders) {
            switch (folder.type) {
                case "form": {
                    // special case because we only need the form-keys and not the whole file
                    promises.set(folder.type, this.getForms(rootDir, folder.path, folder.extension));
                    break;
                }
                default: {
                    promises.set(folder.type, this.getFilesAsJson(rootDir, folder.path, folder.extension));
                    break;
                }
            }
        }

        const filesContent: FolderContent[] = [];
        const keys: string[] = Array.from(promises.keys());
        const settled = await Promise.allSettled(promises.values());
        settled.forEach((result, index) => {
            if (result.status === "fulfilled") {
                filesContent.push({
                    type: keys[index],
                    files: result.value,
                });
            }
        });

        Logger.info("[Miranum.Modeler.Reader]", "Files were read.");

        return filesContent;
    }

    /**
     * Get forms from the current working directory
     * @returns a promise with an array of strings or an empty array
     * @public
     * @async
     */
    public async getForms(rootDir: Uri, directory: string, extension: string): Promise<string[]> {
        const fileContent: string[] = [];
        try {
            const files = await this.readDirectory(rootDir, directory, extension);
            const fileNames: string[] = [];
            for (const [path, content] of files) {
                try {
                    fileContent.push(this.getFormKey(content));
                } catch (error) {
                    fileNames.push(path.substring(fileNames.indexOf("#") + 1));
                    this.showErrorMessage("Failed to read form-key!", rootDir, path, error);
                }
            }
            if (fileNames.length > 0) {
                Logger.error("[Miranum.Modeler.Reader]", `Failed to read form-key of following files:\n${fileNames}`);
            }

            return fileContent;
        } catch (error) {
            const message = (error instanceof Error) ? error.message : "Could not get form keys.";
            Logger.error("[Miranum.Modeler.Reader]", message);
            return [];
        }
    }

    /**
     * Get config files
     * @returns a promise with the content of the config files or an empty array
     * @public
     * @async
     */
    public async getConfigs(rootDir: Uri, directory: string, extension: string): Promise<JSON[]> {
        return this.getFilesAsJson(rootDir, directory, extension);
    }

    /**
     * Get element templates
     * @returns a promise with the content of element templates or an empty array
     * @public
     * @async
     */
    public async getElementTemplates(rootDir: Uri, directory: string, extension: string): Promise<JSON []> {
        return this.getFilesAsJson(rootDir, directory, extension);
    }

    /**
     * Get content of json files
     * @returns a promise with an array of json objects or an empty array
     * @private
     * @async
     */
    public async getFilesAsJson(rootDir: Uri, directory: string, extension: string): Promise<JSON[]> {
        const extParts = extension.split(".");
        const ext = extParts[extParts.length - 1];
        if (ext !== "json") {
            return [];
        }

        const fileContent: JSON[] = [];
        try {
            const files = await this.readDirectory(rootDir, directory, extension);
            const fileNames: string[] = [];
            for (const [path, content] of files) {
                try {
                    fileContent.push(this.getStringAsJson(content));
                } catch (error) {
                    fileNames.push(path.substring(fileNames.indexOf("#") + 1));
                    this.showErrorMessage("Failed to parse text!", rootDir, path, error);
                }
            }
            if (fileNames.length > 0) {
                Logger.error("[Miranum.Modeler.Reader]", `Failed to parse following files:\n${fileNames}`);
            }

            return fileContent;
        } catch (error) {
            const message = (error instanceof Error) ? error.message : "Failed to parse to JSON.";
            Logger.error("[Miranum.Modeler.Reader]", message);
            return [];
        }
    }

    /**
     * Parse given string to a json object
     * @param content the file content
     * @returns a json object
     * @private
     */
    private getStringAsJson(content: string): JSON {
        // eslint-disable-next-line no-useless-catch
        try {
            return JSON.parse(content);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Searches for the form key of a given file
     * @param content the file content
     * @returns the form key as string
     * @private
     */
    private getFormKey(content: string): string {
        // eslint-disable-next-line no-useless-catch
        try {
            const json = JSON.parse(content);
            if (json.key) {
                return json.key;
            } else {
                throw new Error("No key specified!");
            }
        } catch (error) {
            throw error;
        }
    }

    private async readFile(uri: Uri): Promise<string> {
        const file = await this.fs.readFile(uri);
        return Promise.resolve(Buffer.from(file).toString("utf-8"));  // convert Uint8Array to string
    }

    /**
     * Read files and returns their content
     * @param rootDir
     * @param directory Path to the desired files
     * @param fileExtension File extension of the desired files
     * @returns Promise that resolve to the string value of the read files
     * @private
     * @async
     */
    private async readDirectory(rootDir: Uri, directory: string, fileExtension: string): Promise<Map<string, string>> {
        const files: Map<string, Thenable<Uint8Array>> = new Map();
        const content: Map<string, string> = new Map();

        const ext = fileExtension.charAt(0) === "." ? fileExtension.substring(fileExtension.indexOf(".") + 1) : fileExtension;
        const uri = vscode.Uri.joinPath(rootDir, directory);

        // eslint-disable-next-line no-useless-catch
        try {
            const results = await this.fs.readDirectory(uri);
            const fileNames: string[] = [];
            for (const result of results) {
                if (result[1] === vscode.FileType.File) {   // only files
                    const extension = result[0].substring(result[0].indexOf(".") + 1);
                    if (extension && extension === ext) {  // only files with given file extension
                        const fileUri = vscode.Uri.joinPath(uri, result[0]);
                        try {
                            files.set(`${directory}/#${result[0]}`, this.fs.readFile(fileUri));
                        } catch (error) {
                            fileNames.push(result[0]);
                        }
                    }
                }
            }
            if (fileNames.length > 0) {
                Logger.error("[Miranum.Modeler.Reader]", `Following files could not be read:\n${JSON.stringify(fileNames)}`);
                // inform user that a certain file could not be read
                vscode.window.showInformationMessage(
                    `Could not read following files!
                    ${fileNames}`,
                );
            }

            const filePaths = Array.from(files.keys());
            const settled = await Promise.allSettled(files.values());
            settled.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    content.set(
                        filePaths[index],
                        Buffer.from(result.value).toString("utf-8"),  // convert Uint8Array to string
                    );
                }
            });

            return content;

        } catch (error) {
            throw error;
        }
    }

    private showErrorMessage(msg: string, rootDir: Uri, path: string, error: unknown) {
        const strSplit = path.split("#");
        const dir = strSplit[0];
        const name = strSplit[1];
        vscode.window.showInformationMessage(
            `${msg}
            - Folder: ${dir}
            - File: ${name}
            - ${error}`,
            ...["Goto file"],
        ).then((input) => {
            if (input === "Goto file") {
                const uri = vscode.Uri.joinPath(rootDir, dir, name);
                vscode.window.showTextDocument(
                    uri,
                    {
                        preserveFocus: false,
                        preview: false,
                        viewColumn: vscode.ViewColumn.Active,
                    });
            }
        });
    }
}
