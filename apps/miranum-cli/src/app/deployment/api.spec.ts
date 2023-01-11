import {deployAllFiles, deployFileCommand } from "./api"

const appPath = "dist/apps/miranum-clid/main.js";
const target = "local"

describe("deploy all files", () => {
    const projectPath = "resources/my-process-automation-project"
    it(`should work`, async () => {
        const program = deployAllFiles();
        program.parse(["node", appPath, "deploy", "--directory", projectPath, "--target", target]);

        expect(program.args).toEqual(["deploy"]);
        expect(program.opts().directory).toBe(projectPath);
        expect(program.opts().target).toBe(target);
    });
});


describe("deploy files", () => {
    const bpmn = {path: "resources/my-process-automation-project/my-process.bpmn", type: "bpmn"}
    it(`should work`, async () => {
        const program = deployFileCommand();
        program.parse(["node", appPath, "deploy-file", "--file", bpmn.path, "--target", target, "--type", bpmn.type]);

        expect(program.args).toEqual(["deploy-file"]);
        expect(program.opts().file).toBe(bpmn.path);
        expect(program.opts().target).toBe(target);
        expect(program.opts().type).toBe(bpmn.type);
    });

    it(`should not work, due to wrong type`, async () => {
        const miranumJson = {path: "resources/my-process-automation-project/miranum.json", type: "json"}
        const program = deployFileCommand();
        program
            .exitOverride()
            .command("generate")
            .action(() => {});
        let errorMsg;
        try {
            program.parse(["node", appPath, "deploy-file", "--file", miranumJson.path, "--target", target, "--type", miranumJson.type]);
        } catch (error) {
            errorMsg = error;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(errorMsg.code).toBe("commander.invalidArgument");
    });

    it("should not work, due to unknown option", () => {
        const program = deployFileCommand();
        program
            .exitOverride()
            .command("generate")
            .action(() => {});
        let errorMsg;
        try {
            program.parse(["node", appPath, "deploy-file", "--file", bpmn.path, "--target", target, "--type", bpmn.type, "--randomArgument"]);
        } catch (error) {
            errorMsg = error;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(errorMsg.code).toBe("commander.unknownOption");
    });

    it(`should not work, due to missing argument`, async () => {
        const program = deployFileCommand();
        program
            .exitOverride()
            .command("generate")
            .action(() => {});
        let errorMsg;
        try {
            program.parse(["node", appPath, "deploy-file", "--file", bpmn.path, "--type", bpmn.type]);
        } catch (error) {
            errorMsg = error;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(errorMsg.code).toBe("commander.missingMandatoryOptionValue");
    });
});
