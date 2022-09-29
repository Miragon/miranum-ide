import { generateStructure } from "./generate";
import * as fs from "fs";
import * as os from "os";

describe("generateProject", () => {

    it("should work", async () => {
        const projectPath = "resources/ProjectTest";
        const path = "resources";
        if(fs.existsSync(projectPath)){
            fs.rmSync(projectPath, { recursive: true, force: true });
        }

        const generateSuccesses = await generateStructure("ProjectTest", path);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated successfully`);

        fs.rmSync(projectPath, { recursive: true, force: true });
    });

    it("should work without path", async () => {
        const projectPath = "resources/my-generations/basic-project";
        if(fs.existsSync(projectPath)){
            fs.rmSync(projectPath, { recursive: true, force: true });
        }

        const generateSuccesses = await generateStructure("basic-project");
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated successfully`);

        fs.rmSync(projectPath, { recursive: true, force: true });
    });


    it("should work with absolute path outside of project", async () => {
        const projectPath = `${os.homedir()}/Desktop/basic-project`;
        const path = `${os.homedir()}/Desktop`

        if(fs.existsSync(projectPath)){
            fs.rmSync(projectPath, { recursive: true, force: true });
        }

        const generateSuccesses = await generateStructure("basic-project", path);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated successfully`);

        fs.rmSync(projectPath, { recursive: true, force: true });
    });


    it("should fail, due to already existing directory", async () => {
        const projectPath = "resources/my-generations/basic-project";

        const generateSuccessesOriginal = await generateStructure ("basic-project");
        const generateSuccesses = await generateStructure ("basic-project");
        expect(generateSuccesses.success).toBeFalsy();
        expect(generateSuccesses.message).toBe(`Project already exists`);

        fs.rmSync(projectPath, { recursive: true, force: true });
    });

    it("should work to overwrite a project", async () => {
        const projectPath = "resources/my-generations/basic-project";
        const path = "resources/my-generations";

        if(fs.existsSync(projectPath)){
            fs.rmSync(projectPath, { recursive: true, force: true });
        }

        const generateSuccessesOriginal = await generateStructure ("basic-project", path);
        const generateSuccesses = await generateStructure ("basic-project",path, true);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated successfully`);

        fs.rmSync(projectPath, { recursive: true, force: true });
    });

});
