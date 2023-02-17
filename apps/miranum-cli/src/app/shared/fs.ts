import * as fs from "fs/promises";
import * as path from "path";
import {
    createMiranumCore,
    FileDetails,
    MiranumCore,
    MiranumDeploymentPlugin,
    MiranumDeploymentPluginRest
} from "@miranum-ide/miranum-core";

export async function mapProcessConfigToDigiwfLib(projectPath?: string): Promise<MiranumCore> {
    try {
        const p = projectPath ? `${projectPath}/miranum.json`.replace("//", "/") : "miranum.json";
        const miranumJson = JSON.parse((await getFile(p)).content);
        const plugins: MiranumDeploymentPlugin[] = [];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        miranumJson.deployment.forEach(deployment => {
            plugins.push(new MiranumDeploymentPluginRest(deployment.plugin, deployment.targetEnvironments));
        });
        return createMiranumCore(miranumJson.projectVersion, miranumJson.name, miranumJson.workspace, plugins);
    } catch (error) {
        return new MiranumCore();
    }
}

export async function getFile(pathToFile: string): Promise<FileDetails> {
    try {
        if ((await fs.lstat(pathToFile)).isFile()) {
            const ext = path.extname(pathToFile);
            const name = path.basename(pathToFile);
            const size = (await fs.stat(pathToFile)).size;
            const file = await fs.readFile(pathToFile, { encoding: "utf8" });

            return {
                "name": name,
                "extension": ext,
                "content": file.toString(),
                "size": size,
            };
        }
    } catch {
        throw new Error(`Path ${pathToFile} is a directory. Provide a path to a file.`);
    }
    throw new Error(`File not found on path ${pathToFile}`);
}

export async function getFiles(pathToDirectory: string, supportedFileExtensions: string): Promise<FileDetails[]> {
    try {
        const files: FileDetails[] = [];
        const filesInDirectory = (await fs.readdir(pathToDirectory));
        for (const file of filesInDirectory) {
            const pathToFile = `${pathToDirectory}/${file}`.replace("//", "/");

            const fileStat = await fs.lstat(pathToFile);
            // check if file is file and file has supported file extension
            if (fileStat.isFile() && file.includes(supportedFileExtensions) && file !== "miranum.json") {
                files.push(await getFile(pathToFile));
            } else if (fileStat.isDirectory()) {
                // search for files in subdir with recursive call
                files.push(...(await getFiles(pathToFile, supportedFileExtensions)));
            }
            // do nothing with unsupported files
        }
        return files;
    }  catch (error) {
        throw new Error(`File not found on path ${pathToDirectory}`);
    }
}

export async function saveFile(projectDir: string, pathInProject: string, fileContent: string): Promise<void> {
    const file = `${projectDir}/${pathInProject}`.replace("//", "/");
    const projectPath = file.substring(0, file.lastIndexOf("/"));
    try {
        await fs.access(projectPath);
    } catch {
        await fs.mkdir(projectPath, { recursive: true });
    }
    await fs.writeFile(`${projectDir}/${pathInProject}`.replace("//", "/"), fileContent, { flag: "w+" });
}

