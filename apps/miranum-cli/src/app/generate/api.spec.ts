import {generateProject, generateFile} from "./api"
import * as fs from "fs";

const appPath = "dist/apps/miranum-clid/main.js";
const myGenerations = "resources/my-generations";
const projectName = "test-project";

// afterEach(() => {
//     fs.rmdirSync(`${myGenerations}/${projectName}`);
// });

describe("generate bpmn project", () => {
    it(`should work`,  () => {
        expect(fs.existsSync(`${myGenerations}/${projectName}`)).toBe(false);

        const program = generateProject();
        program.parse(["node", appPath, "generate", "--name", projectName, "--path", myGenerations]);

        expect(program.args).toEqual(["generate"]);
        expect(program.opts().name).toBe(projectName);
        expect(program.opts().path).toBe(myGenerations);
        //expect(fs.existsSync(`${myGenerations}/${projectName}`)).toBe(true);
    });

    it("should not work, due to unknown option", () => {
        const program = generateProject();
        program
            .exitOverride()
            .command("generate")
            .action(() => {});
        let caughtErr;
        try {
            program.parse(["node", appPath, "generate", "--name", projectName, "--path", myGenerations, "--randomArgument"]);
        } catch (err) {
            caughtErr = err;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(caughtErr.code).toBe("commander.unknownOption");
    });

    it(`should not work, due to missing argument`, async () => {
        const program = generateProject();
        program
            .exitOverride()
            .command("generate")
            .action(() => {});
        let errorMsg;
        try {
            program.parse(["node", appPath, "generate", "--path", myGenerations]);
        } catch (error) {
            errorMsg = error;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(errorMsg.code).toBe("commander.missingMandatoryOptionValue");
    });
});

describe("generate file", () => {
    interface FileHelper {
        name: string;
        type: string;
        extension: string;
        dir: string;
        content: string;
    }

    const filesToGenerate: FileHelper[] = [
        {name: "my-process", type: "bpmn", extension: "bpmn", dir: "", content: `name="my-process" isExecutable="true">\n    <bpmn:documentation></bpmn:documentation>`},
        {name: "my-decision-table", type: "dmn", extension: "dmn", dir: "", content: `name="Decision 1">\n    <decisionTable id="DecisionTable_1shndzu">\n      <input id="Input_1">`},
        {name: "my-form", type: "form", extension: "form", dir: "forms", content: `"key": "my-form",\n  "schema": {\n    "type": "object",\n    "x-display": "stepper",`},
        {name: "my-config", type: "config", extension: "config", dir: "configs", content: `"key": "my-config",\n  "statusDokument": "",\n  "statusConfig": [],\n  "configs": [`},
        {name: "my-element-template", type: "element-template", extension: "json", dir: "element-templates", content: `"name": "my-element-template",`},
    ];

    for (const file of filesToGenerate) {
        const program = generateFile();

        it(`generate ${file.type} on top-level`, () => {
            //expect(fs.existsSync(`${myGenerations}/${file.name}.${file.extension}`)).toBe(false);
            program.parse(["node", appPath, "generate-file", "--type", file.type, "--name", file.name, "--path", myGenerations]);
            expect(program.args).toEqual(["generate-file"]);
            expect(program.opts().type).toBe(file.type);
            expect(program.opts().name).toBe(file.name);
            expect(program.opts().path).toBe(myGenerations);
            //expect(fs.existsSync(`${myGenerations}/${file.name}.${file.extension}`)).toBe(true);
            //expect(fs.readFileSync(`${myGenerations}/${file.name}.${file.extension}`, 'utf-8')).toContain(file.content);
        });

        it(`generate ${file.type} in subfolder`, () => {
            //expect(fs.existsSync(`${myGenerations}/${file.name}.${file.extension}`)).toBe(false);
            //generateProject().parse(["node", appPath, "generate", "--name", projectName, "--path", myGenerations]);
            program.parse(["node", appPath, "generate-file", "--type", file.type, "--name", file.name, "--path", `${myGenerations}/${projectName}/forms`]);
            expect(program.args).toEqual(["generate-file"]);
            expect(program.opts().type).toBe(file.type);
            expect(program.opts().name).toBe(file.name);
            expect(program.opts().path).toBe(`${myGenerations}/${projectName}/forms`);
            //expect(fs.existsSync(`${myGenerations}/${projectName}/forms/${file.name}.${file.extension}`)).toBe(true);
            //expect(fs.readFileSync(`${myGenerations}/${projectName}/forms/${file.name}.${file.extension}`, 'utf-8')).toContain(file.content);
        });
    }

    it("should not work, due to unknown option", () => {
        const program = generateFile();
        program
            .exitOverride()
            .command("generate-file")
            .action(() => {});
        let caughtErr;
        try {
            program.parse(["node", appPath, "generate-file", "--type", "bpmn", "--name", "name", "--path", myGenerations, "--randomArgument"]);
        } catch (err) {
            caughtErr = err;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(caughtErr.code).toBe("commander.unknownOption");
    });

    it(`should not work, due to missing argument`, async () => {
        const program = generateFile();
        program
            .exitOverride()
            .command("generate-file")
            .action(() => {});
        let errorMsg;
        try {
            program.parse(["node", appPath, "generate-file", "--type", "bpmn", "--path", myGenerations]);
        } catch (error) {
            errorMsg = error;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(errorMsg.code).toBe("commander.missingMandatoryOptionValue");
    });
});
