import {Success} from "../types";
import * as fs from "fs";
import * as util from "util";

export async function generate(type: string, filePath: string, content: string, templateBase?: string | undefined): Promise<Success> {
    try {
        const writeFilePromise = util.promisify(fs.writeFile);
        await writeFilePromise(`${filePath}.${type}`, content);
        return {
            success: true,
            message: `Generated ${filePath}.${type} successfully`
        };
    } catch (err) {
        return {
            success: false,
            message: `Failed to generate ${filePath}.${type}`
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
        generate("bpmn","resources/basicStructure/basic", content);
        generate("form","resources/basicStructure/form1", content);
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
