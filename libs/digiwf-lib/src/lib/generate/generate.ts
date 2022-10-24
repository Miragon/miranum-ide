import {Success} from "../types";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as util from "util";
import * as Sqrl from "squirrelly";
import  * as colors from "colors";
import {getFiles} from "../read-fs/read-fs";

export async function createFile(filePath: string, content: string): Promise<Success> {
    try {
        const writeFilePromise = util.promisify(fs.writeFile);
        await writeFilePromise(filePath, content);
        console.log(colors.green.bold("GENERATED ") + filePath);
        return {
            success: true,
            message: `Generated ${filePath} successfully`
        };
    } catch (err) {
        console.log(colors.red.bold("FAILED ") + `generating ${filePath} with -> ${err}`);
        return {
            success: false,
            message: `Failed to generate ${filePath}`
        }
    }
}

export async function copyAndFillStructure(name: string, path?: string, force?: boolean): Promise<Success> {
    const srcDir = `resources/templates/basicProjectTemplate`;
    const destDir = path? `${path}/${name}` : `resources/my-generations/${name}`;

    const checkPromise = util.promisify(fs.exists);
    if(!force && await checkPromise(destDir)) {
        console.log(colors.red.bold("ERROR ") + `${destDir} already exists`);
        return {
            success: false,
            message: `Project already exists`
        };
    }

    try {
        await fse.copy(srcDir, destDir);
        const files = await getFiles(destDir);
        for (const file of files) {
            await createContentAndFile(file.path, {key : name}, file.path);
        }
        console.log(colors.green.bold("SUCCESSFULLY GENERATED ") + destDir);
        console.log(colors.cyan("Your project is ready for usage, enjoy!"));
        return {
            success: true,
            message: `Generated successfully`
        };
    } catch (err) {
        console.log(colors.red.bold("FAILED ") + `generating ${destDir} with-> ${err}`);
        return {
            success: false,
            message: `Failed to generate a structure`
        }
    }
}


//------------------------------ HELPER METHODS ------------------------------//
async function createContentAndFile(templatePath: string, templateData: any, creationPath: string){
    const content = await  Sqrl.renderFile(templatePath, templateData);
    await createFile(creationPath, content);
}
