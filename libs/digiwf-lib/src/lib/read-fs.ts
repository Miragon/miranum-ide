import * as fs from "fs/promises";
import * as path from "path";
import { FileDetails } from "./types";

const supportedFiles = [".bpmn", ".dmn", ".config", ".json"]

export async function getFile(pathToFile: string): Promise<FileDetails> {
    try {
        if ((await fs.lstat(pathToFile)).isFile()){
            const ext = path.extname(pathToFile);
            const name = path.basename(pathToFile);
            const size = (await fs.stat(pathToFile)).size;
            const file = await fs.readFile(pathToFile, { encoding: "utf8" });

            return {
                "name": name,
                "extension": ext,
                "content": file.toString(),
                "size": size
            }
        }
    }
    catch {
        throw new Error(`Path ${pathToFile} is a directory. Provide a path to a file.`);
    }
    throw new Error(`File not found on path ${pathToFile}`);
}

export async function getFiles(pathToDirectory: string): Promise<FileDetails[]> {
    try {
        const files: FileDetails[] = [];
        const filesInDirectory = (await fs.readdir(pathToDirectory));
        for (const file of filesInDirectory) {
            const pathToFile = `${pathToDirectory}/${file}`.replace("//", "/");

            const fileStat = await fs.lstat(pathToFile);
            // check if file is file and file has supported file extension
            if (fileStat.isFile() && supportedFiles.filter(supportedFile => file.includes(supportedFile)).length !== 0) {
                files.push(await getFile(pathToFile));
            }
            else if (fileStat.isDirectory()) {
                // search for files in subdir with recursive call
                files.push(...(await getFiles(pathToFile)));
            }
            // do nothing with unsupported files
        }
        return files;
    }
    catch(error: any) {
        throw new Error(`File not found on path ${pathToDirectory}`);
    }
}
