import {Success} from "../types";
import * as fs from "fs";
import * as util from "util";
import * as Sqrl from "squirrelly";
import {readFile} from "fs/promises";

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

export async function generateStructure(name: string, path?: string, force?: boolean): Promise<Success> {
    let usedPath = `resources/my-generations/${name}`;
    if(path){
        usedPath = `${path}/${name}`;
    }

    try {
        const checkPromise = util.promisify(fs.exists);
        if(await checkPromise(usedPath) && !force) {
            return {
                success: false,
                message: `Project already exists`
            };
        }
        const FILES = [
            {src: "resources/templates/config-default.json", data: {key: `${name}-dev`, serviceKey: "S3Service", serviceValue: "dwf-s3-local-01"}, destination: `${usedPath}/configs/dev.config.json`},
            {src: "resources/templates/config-default.json", data: {key: `${name}-prod`, serviceKey: "S3Service", serviceValue: "dwf-s3-prod"}, destination: `${usedPath}/configs/prod-config.json`},
            {src: "resources/templates/form-default.form", data: {name: `${name}check_form`
                    , allOf: await Sqrl.renderFile("resources/templates/buildingblocks/FORMFIELD_input_text.json", {inputKey: "FORMFIELD_input_text"})
                        + "," + await Sqrl.renderFile("resources/templates/buildingblocks/FORMFIELD_check_approve.json", {checkKey: "FORMFIELD_input_check_approve"})
                    , allOfKey: "FORMSECTION_check"}, destination: `${usedPath}/forms/control.form`
            },
            {src: "resources/templates/form-default.form", data: {name: `${name}_start_form`
                    , allOf: await Sqrl.renderFile("resources/templates/buildingblocks/FORMFIELD_input_text.json", {inputKey: "FORMFIELD_input_text_field"})
                    , allOfKey: "FORMSECTION_input"}, destination: `${usedPath}/forms/start.form`
            },
            {src: "resources/templates/bpmn-advanced.bpmn", data: {id: "example-process", name: name, formKey: `${name}_start_form`, checkForm: `${name}_check_form`}, destination: `${usedPath}/${name}.bpmn`},
            {src: "resources/templates/dmn-default.dmn", data: {Definition_id: "001", name: name, version: "7.17.0", DecisionName: "Decision 1"}, destination: `${usedPath}/${name}.dmn`}
        ];

        const mkDirPromise = util.promisify(fs.mkdir);
        await mkDirPromise(usedPath, { recursive: true });

        await makeDir(`${usedPath}/configs`);
        await makeDir(`${usedPath}/element-templates`);
        await makeDir(`${usedPath}/forms`);

        await createFile(`${usedPath}/README.md`, readFile("resources/templates/README-layout.md").toString());
        await createFile(`${usedPath}/element-templates/.gitkeep`, "");

        FILES.forEach(f => {
            createContentAndFile(f.src, f.data, f.destination);
        });

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

async function makeDir(path: string) {
    const checkPromise = util.promisify(fs.exists);
    if(! await checkPromise(path)) {
        const mkDirPromise = util.promisify(fs.mkdir);
        await mkDirPromise(path);
    }
}

async function createContentAndFile(templatePath: string, templateData: any, creationPath: string){
    const content = await  Sqrl.renderFile(templatePath, templateData);
    await createFile(creationPath, content);
}
