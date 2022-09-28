import {Success} from "../types";
import * as fs from "fs";
import * as util from "util";

export async function createFile(filePath: string, content: string): Promise<Success> {
    try {
        const writeFilePromise = util.promisify(fs.writeFile);
        await writeFilePromise(filePath, content);
        return {
            success: true,
            message: `Generated ${filePath} successfully`
        };
    } catch (err) {
        return {
            success: false,
            message: `Failed to generate ${filePath}`
        }
    }
}

export async function generateStructure(path?: string): Promise<Success> {
    let usedPath = "resources/basicStructure"
    if(path){
        usedPath = path;
    }

    try {
        if(!fs.existsSync(usedPath)){
            fs.mkdirSync(usedPath, { recursive: true });
        }
        const content =""; //get this out of digiwf-lib? or somehow place it in generate method
        createFile("resources/basicStructure/basic.bpmn", content);
        createFile("resources/basicStructure/form1.schema.json", content);
        return {
            success: true,
            message: `Generated successfully`
        };
    } catch (err) {
        return {
            success: false,
            message: `Failed to generate a structure`
        }
    }
}
