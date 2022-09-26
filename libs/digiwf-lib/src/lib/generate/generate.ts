import {Success} from "../types";
import * as fs from "fs";
import * as util from "util";

export async function generate(filePath: string, content: string, templateBase?: string | undefined): Promise<Success> {
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
