import {copyStructure, generateStructure} from "./generate";
import * as fs from "fs";
import * as os from "os";
import {Success} from "../types";

function setUp(dirPath: string) {
    if(fs.existsSync(dirPath)){
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
}
function tearDown(dirPath: string) {
    fs.rmSync(dirPath, { recursive: true, force: true });
}

function expTruthy(successes: Success) {
    expect(successes.success).toBeTruthy();
    expect(successes.message).toBe(`Generated successfully`);
}

function expFalsy(successes: Success) {
    expect(successes.success).toBeFalsy();
    expect(successes.message).toBe(`Project already exists`);
}

const projectPath = "resources/my-generations/basic-project";
const path = "resources/my-generations";


describe("generateProject", () => {

    it("should work", async () => {
        const projectPath = "resources/ProjectTest";
        const path = "resources";
        setUp(projectPath);
        expTruthy(await generateStructure("ProjectTest", path));
        tearDown(projectPath);
    });

    it("should work without path", async () => {
        setUp(projectPath);
        expTruthy(await generateStructure("basic-project"));
        tearDown(projectPath);
    });


    it("should work with absolute path outside of project", async () => {
        const projectPath = `${os.homedir()}/Desktop/basic-project`;
        const path = `${os.homedir()}/Desktop`;

        setUp(projectPath);
        expTruthy(await generateStructure("basic-project", path));
        tearDown(projectPath);
    });


    it("should fail, due to already existing directory", async () => {
        const generateSuccessesOriginal = await generateStructure ("basic-project");
        const generateSuccesses = await generateStructure ("basic-project");
        expFalsy(generateSuccesses);
        tearDown(projectPath);
    });

    it("should work to overwrite a project", async () => {
        setUp(projectPath);
        const generateSuccessesOriginal = await generateStructure ("basic-project", path);
        const generateSuccesses = await generateStructure ("basic-project",path, true);
        expTruthy(generateSuccesses);
        tearDown(projectPath);
    });

});


describe("copyProject", () => {

    it("should work without path", async () => {
        setUp(projectPath);
        expTruthy(await copyStructure("basic-project"));
        tearDown(projectPath);
    });

    it("should work with absolute path outside of project", async () => {
        const projectPath = `${os.homedir()}/Desktop/Desktop-project`;
        const path = `${os.homedir()}/Desktop`;

        setUp(projectPath);
        expTruthy(await copyStructure("Desktop-project", path));
        tearDown(projectPath);
    });

    it("should fail, due to already existing directory", async () => {
        const copySuccessesOriginal = await copyStructure ("basic-project");
        const copySuccesses = await generateStructure ("basic-project");
        expFalsy(copySuccesses);
        tearDown(projectPath);
    });

    it("should work to overwrite a project", async () => {
        setUp(projectPath);
        const copySuccessesOriginal = await copyStructure ("basic-project", path);
        const copySuccesses = await generateStructure ("basic-project",path, true);
        expTruthy(copySuccesses);
        tearDown(projectPath);
    });
});
