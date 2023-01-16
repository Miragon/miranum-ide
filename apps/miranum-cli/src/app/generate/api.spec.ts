import {generateProject, generateFile} from "./api"
import * as fs from "fs";
import {shouldNotWork, sleep} from "../shared/testHelpers";
import {Command} from "commander";

jest.setTimeout(30000);

interface FileHelper {
    name: string;
    type: string;
    extension: string;
    dir: string;
    content: string;
}

const appPath = "dist/apps/miranum-cli/main.js";
const myGenerations = "resources/my-generations";
const projectName = "test-project";
const dirPath = `${myGenerations}/${projectName}`;

describe("generate bpmn project", () => {
    it(`should work`,  async () => {
        checkExistence(dirPath, false);

        const program = generateProject();
        program.parse(["node", appPath, "generate", "--name", projectName, "--path", myGenerations]);

        await sleep(1500);
        expect(program.args).toEqual(["generate"]);
        expect(program.opts().name).toBe(projectName);
        expect(program.opts().path).toBe(myGenerations);
        checkExistence(dirPath, true);
        cleanUpDir();
    });

    it("should not work, due to unknown option", () => {
        shouldNotWork(generateProject(), "generate",
            ["node", appPath, "generate", "--name", projectName, "--path", myGenerations, "--randomArgument"],
            "error: unknown option '--randomArgument'"
        );
    });

    it(`should not work, due to missing argument`, async () => {
        shouldNotWork(generateProject(), "generate",
            ["node", appPath, "generate", "--path", myGenerations],
            "error: required option '-n, --name <name>' not specified"
        );
    });
});

describe("generate file", () => {
    const filesToGenerate: FileHelper[] = [
        {name: "my-process", type: "bpmn", extension: "bpmn", dir: "", content: `name="my-process" isExecutable="true">\n    <bpmn:documentation></bpmn:documentation>`},
        {name: "my-decision-table", type: "dmn", extension: "dmn", dir: "", content: `name="Decision 1">\n    <decisionTable id="DecisionTable_1shndzu">\n      <input id="Input_1">`},
        {name: "my-form", type: "form", extension: "form", dir: "forms", content: `"key": "my-form",\n  "schema": {\n    "type": "object",\n    "x-display": "stepper",`},
        {name: "my-config", type: "config", extension: "config", dir: "configs", content: `"key": "my-config",\n  "statusDokument": "",\n  "statusConfig": [],\n  "configs": [`},
        {name: "my-element-template", type: "element-template", extension: "json", dir: "element-templates", content: `"name": "my-element-template",`},
    ];

    for (const file of filesToGenerate) {
        const program = generateFile();

        it(`generate ${file.type} as standalone`, async () => {
            const expectedFilePath = `${myGenerations}/${file.name}.${file.extension}`;
            checkExistence(expectedFilePath, false);

            program.parse(["node", appPath, "generate-file", "--type", file.type, "--name", file.name, "--path", myGenerations]);

            await sleep(1500);
            fileChecks(program, file,["generate-file"], myGenerations, expectedFilePath);
            fs.rm(expectedFilePath, () => {});
        });

        it(`generate ${file.type} on top-level`, async () => {
            generateProject().parse(["node", appPath, "generate", "--name", projectName, "--path", myGenerations]);
            const expectedFilePath = `${dirPath}/${file.dir}/${file.name}.${file.extension}`;

            await sleep(1500);
            checkExistence(expectedFilePath, false);
            program.parse(["node", appPath, "generate-file", "--type", file.type, "--name", file.name, "--path", dirPath]);

            await sleep(1500);
            fileChecks(program, file,["generate-file"], dirPath, expectedFilePath);
            cleanUpDir();
        });

        it(`generate ${file.type} in subfolder`, async () => {
            generateProject().parse(["node", appPath, "generate", "--name", projectName, "--path", myGenerations]);
            const expectedFilePath = `${dirPath}/forms/${file.name}.${file.extension}`;

            await sleep(1500);
            checkExistence(expectedFilePath, false);
            program.parse(["node", appPath, "generate-file", "--type", file.type, "--name", file.name, "--path", `${dirPath}/forms`]);

            await sleep(1500);
            fileChecks(program, file,["generate-file"], `${dirPath}/forms`, expectedFilePath);
            cleanUpDir();
        });
    }

    it("should not work, due to unknown option", () => {
        shouldNotWork(generateFile(), "generate-file",
            ["node", appPath, "generate-file", "--type", "bpmn", "--name", "name", "--path", myGenerations, "--randomArgument"],
            "error: unknown option '--randomArgument'"
        );
    });

    it(`should not work, due to missing argument`, async () => {
        shouldNotWork(generateFile(), "generate-file",
            ["node", appPath, "generate-file", "--type", "bpmn", "--path", myGenerations],
            "error: required option '-n, --name <name>' not specified"
        );
    });
});

//   ------------------------HELPERS------------------------   \\
function checkArgsAndPath(program: Command, args: string[], path: string) {
    expect(program.args).toEqual(args);
    expect(program.opts().path).toBe(path);
}

function checkExistence(path: string, expectation: boolean) {
    expect(fs.existsSync(path)).toBe(expectation);
}

function checkContent(path: string, content: string) {
    fs.readFile(path, 'utf-8', (err, data) => {
        expect(data).toContain(content);
    });
}

function fileChecks(program: Command, file: FileHelper, args: string[], inputPath: string, expectedPath: string) {
    checkArgsAndPath(program, args, inputPath);
    expect(program.opts().type).toBe(file.type);
    expect(program.opts().name).toBe(file.name);
    checkExistence(expectedPath, true);
    checkContent(expectedPath, file.content);
}

function cleanUpDir() {
    fs.rmdir(dirPath, {recursive: true}, () => {});
}
