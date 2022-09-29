import { generateStructure } from "./generate";
import * as fs from "fs";
import * as os from "os";

describe("generateProject", () => {

    it("should work", async () => {
        const projectPath = "resources/my-generations/ProjectTest";
        if(fs.existsSync(projectPath)){
            fs.rmSync(projectPath, { recursive: true, force: true });
        }

        const generateSuccesses = await generateStructure(projectPath);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated successfully`);

        fs.rmSync(projectPath, { recursive: true, force: true });
    });

    it("should work without path", async () => {
        const projectPath = "resources/my-generations/basic-project";
        if(fs.existsSync(projectPath)){
            fs.rmSync(projectPath, { recursive: true, force: true });
        }

        const generateSuccesses = await generateStructure();
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated successfully`);

        fs.rmSync(projectPath, { recursive: true, force: true });
    });


    it("should work with absolute path outside of project", async () => {
        const projectPath = `${os.homedir()}/Desktop/ProjectTest`;
        if(fs.existsSync(projectPath)){
            fs.rmSync(projectPath, { recursive: true, force: true });
        }

        const generateSuccesses = await generateStructure(projectPath);
        expect(generateSuccesses.success).toBeTruthy();
        expect(generateSuccesses.message).toBe(`Generated successfully`);

        fs.rmSync(projectPath, { recursive: true, force: true });
    });


    /* no error nor negative example yet
    it("should raise an error", async () => {
        const generateSuccesses = await generateStructure (//tbd);
        expect(generateSuccesses.success).toBeFalsy();
        expect(generateSuccesses.message).toBe(`Failed to generate a structure`);
    });
    it("should not work", async () 0> {
        return generateStructure( //tbd )
            .catch(e => expect(e).not.toBeNull());
    });
    */
});
