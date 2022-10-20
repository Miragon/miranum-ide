import {Success} from "../types";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as util from "util";
import * as Sqrl from "squirrelly";
import {readFile} from "fs/promises";
import {getFiles} from "../read-fs/read-fs";

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

export async function copyAndFillStructure(name: string, path?: string, force?: boolean): Promise<Success> {
    const srcDir = `resources/templates/basicProjectTemplate`;
    const destDir = path? `${path}/${name}` : `resources/my-generations/${name}`;

    const checkPromise = util.promisify(fs.exists);
    if(!force && await checkPromise(destDir)) {
        return {
            success: false,
            message: `Project already exists`
        };
    }

    try {
        await fse.copy(srcDir, destDir);
        const files = await getFiles(destDir);
        files.forEach(file => {
            createContentAndFile(file.path, {key : name}, file.path);
        })
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


//------------------------------ HELPER METHODS ------------------------------//
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


//------------------------------ Legacy Code ------------------------------//
/**
 * enables user to manually/hard-code create a project;
 * but also create forms based on their base and different building-blocks
 */
export async function generateStructure(name: string, path?: string, force?: boolean): Promise<Success> {
    let usedPath = `resources/my-generations/${name}`;
    if(path){
        usedPath = `${path}/${name}`;
    }

    try {
        const checkPromise = util.promisify(fs.exists);
        if(!force && await checkPromise(usedPath)) {
            return {
                success: false,
                message: `Project already exists`
            };
        }
        const FILES = [
            {src: "resources/templates/basicTemplates/config-default.json", data: {key: `${name}-dev`, serviceKey: "S3Service", serviceValue: "dwf-s3-local-01"}, destination: `${usedPath}/configs/dev.config.json`},
            {src: "resources/templates/basicTemplates/config-default.json", data: {key: `${name}-prod`, serviceKey: "S3Service", serviceValue: "dwf-s3-prod"}, destination: `${usedPath}/configs/prod-config.json`},
            {src: "resources/templates/basicTemplates/form-default.form", data: {name: `${name}check_form`
                    , allOf: await Sqrl.renderFile("resources/templates/basicTemplates/buildingblocks/FORMFIELD_input_text.json", {inputKey: "FORMFIELD_input_text"})
                        + "," + await Sqrl.renderFile("resources/templates/basicTemplates/buildingblocks/FORMFIELD_check_approve.json", {checkKey: "FORMFIELD_input_check_approve"})
                    , allOfKey: "FORMSECTION_check"}, destination: `${usedPath}/forms/control.form`
            },
            {src: "resources/templates/basicTemplates/form-default.form", data: {name: `${name}_start_form`
                    , allOf: await Sqrl.renderFile("resources/templates/basicTemplates/buildingblocks/FORMFIELD_input_text.json", {inputKey: "FORMFIELD_input_text_field"})
                    , allOfKey: "FORMSECTION_input"}, destination: `${usedPath}/forms/start.form`
            },
            {src: "resources/templates/basicTemplates/bpmn-advanced.bpmn", data: {id: "example-process", name: name, formKey: `${name}_start_form`, checkForm: `${name}_check_form`}, destination: `${usedPath}/${name}.bpmn`},
            {src: "resources/templates/basicTemplates/dmn-default.dmn", data: {Definition_id: "001", name: name, version: "7.17.0", DecisionName: "Decision 1"}, destination: `${usedPath}/${name}.dmn`}
        ];

        const mkDirPromise = util.promisify(fs.mkdir);
        await mkDirPromise(usedPath, { recursive: true });

        await makeDir(`${usedPath}/configs`);
        await makeDir(`${usedPath}/element-templates`);
        await makeDir(`${usedPath}/forms`);

        await createFile(`${usedPath}/README.md`, readFile("resources/templates/basicTemplates/README-layout.md").toString());
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
