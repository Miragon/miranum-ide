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
