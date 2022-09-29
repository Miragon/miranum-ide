import {Success} from "../types";
import * as fs from "fs";
import * as util from "util";
import * as Sqrl from "squirrelly";
import {readFileSync} from "fs";

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
    let usedPath = "resources/my-generations/basic-project"
    if(path){
        usedPath = `${path}/basic-project`;
    }

    try {
        if(!fs.existsSync(usedPath)){
            fs.mkdirSync(usedPath, { recursive: true });
        }
        fs.mkdirSync(`${usedPath}/configs`);
        fs.mkdirSync(`${usedPath}/element-templates`);
        fs.mkdirSync(`${usedPath}/forms`);

        const contentMD = readFileSync("resources/templates/README-layout.md").toString()
        await createFile(`${usedPath}/README.md`,contentMD);

        const contentDevConfig = await Sqrl.renderFile("resources/templates/config-default.json"
                                    , {key: "example-process-dev", serviceKey: "S3Service", serviceValue: "dwf-s3-local-01"});
        await createFile(`${usedPath}/configs/dev.config.json`, contentDevConfig);
        const contentProdConfig = await Sqrl.renderFile("resources/templates/config-default.json"
                                    , {key: "example-process-prod", serviceKey: "S3Service", serviceValue: "dwf-s3-prod"});
        await createFile(`${usedPath}/configs/prod-config.json`, contentProdConfig);

        await createFile(`${usedPath}/element-templates/.gitkeep`, "");

        const contentControlForm = await  Sqrl.renderFile("resources/templates/form-default.form"
                                    , {name: "example-process_check_form"
                                            , allOf: await Sqrl.renderFile("resources/templates/buildingblocks/FORMFIELD_input_text.json"
                                                                        , {inputKey: "FORMFIELD_input_text"})
                                                        + ","
                                                        + await Sqrl.renderFile("resources/templates/buildingblocks/FORMFIELD_check_approve.json"
                                                                        , {checkKey: "FORMFIELD_input_check_approve"})
                                            , allOfKey: "FORMSECTION_check"});
        await createFile(`${usedPath}/forms/control.form`, contentControlForm);
        const contentStartForm = await  Sqrl.renderFile("resources/templates/form-default.form"
                                    , {name: "example-process_start_form"
                                            , allOf: await Sqrl.renderFile("resources/templates/buildingblocks/FORMFIELD_input_text.json"
                                                                        , {inputKey: "FORMFIELD_input_text_field"})
                                            , allOfKey: "FORMSECTION_input"});
        await createFile(`${usedPath}/forms/start.form`, contentStartForm);

        const contentBPMN = await  Sqrl.renderFile("resources/templates/bpmn-advanced.bpmn"
                                    , {id: "example-process", name: "Beispielprozess", formKey: "example-process_start_form", checkForm: "example-process_check_form"});
        await createFile(`${usedPath}/example-process.bpmn`, contentBPMN);
        const contentDMN = await  Sqrl.renderFile("resources/templates/dmn-default.dmn"
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
