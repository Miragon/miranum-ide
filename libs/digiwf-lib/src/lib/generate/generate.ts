import {Success} from "../types";
import * as fs from "fs";
import * as util from "util";
import * as Sqrl from "squirrelly";

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
    let usedPath = "resources/basic-project-structure"
    if(path){
        usedPath = `${path}/basic-project-structure`;
    }

    try {
        if(!fs.existsSync(usedPath)){
            fs.mkdirSync(usedPath, { recursive: true });
        }
        fs.mkdirSync(`${usedPath}/configs`);
        fs.mkdirSync(`${usedPath}/element-templates`);
        fs.mkdirSync(`${usedPath}/forms`);

        const contentDevConfig = await Sqrl.renderFile("resources/templates/config-default.json"
                                    , {key: "example-process-dev", serviceKey: "S3Service", serviceValue: "dwf-s3-local-01"});
        await createFile(`${usedPath}/configs/dev.config.json`, contentDevConfig);
        const contentProdConfig = await Sqrl.renderFile("resources/templates/config-default.json"
                                    , {key: "example-process-prod", serviceKey: "S3Service", serviceValue: "dwf-s3-prod"});
        await createFile(`${usedPath}/configs/prod-config.json`, contentProdConfig);

        const contentElement = await  Sqrl.renderFile("resources/templates/element-default.json"
                                    , {name: "exampleTemplate", id: "id"});
        await createFile(`${usedPath}/element-templates/example-template.json`, contentElement);

        const contentControlForm = await  Sqrl.renderFile("resources/templates/form-default.schema.json"
                                    , {key: "4560db7e-64a3-49fc-ab6f-3d308d86dd9a", type: "object"});
        await createFile(`${usedPath}/forms/control.form`, contentControlForm);
        const contentStartForm = await  Sqrl.renderFile("resources/templates/form-default.schema.json"
                                    , {key: "32dcafc9-5a3d-4ed9-ac91-3cb68383e4ac", type: "object"});
        await createFile(`${usedPath}/forms/start.form`, contentStartForm);

        const contentBPMN = await  Sqrl.renderFile("resources/templates/bpmn-default.bpmn"
                                    , {version: "7.17.0", Process_id: "007", name: "example-process", doc: "doc"});
        await createFile(`${usedPath}/example-process.bpmn`, contentBPMN);
        const contentDMN = await  Sqrl.renderFile("resources/templates/form-default.schema.json"
                                    , {Definition_id: "001", name: "example-dmn", version: "7.17.0", DecisionName: "Decision 1"});
        await createFile(`${usedPath}/example-dmn.dmn`, contentDMN);


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
