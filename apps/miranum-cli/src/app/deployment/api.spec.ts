import {deployAllFiles, deployFileCommand } from "./api"

const appPath = "dist/apps/miranum-clid/main.js";
const target = "local"

describe("deploy all files", () => {
    const projectPath = "resources/my-process-automation-project"
    it(`generate a bpmn project`, async () => {
        const program = deployAllFiles();
        program.parse(["node", appPath, "deploy", "--directory", projectPath, "--target", target]);

        expect(program.args).toEqual(["deploy"]);
        expect(program.opts().directory).toBe(projectPath);
        expect(program.opts().target).toBe(target);
    });
});


describe("deploy files", () => {
    const bpmn = {path: "resources/my-process-automation-project/my-process.bpmn", type: "bpmn"}
    it(`generate a bpmn project`, async () => {
        const program = deployFileCommand();
        program.parse(["node", appPath, "deploy-file", "--file", bpmn.path, "--target", target, "--type", bpmn.type]);

        expect(program.args).toEqual(["deploy-file"]);
        expect(program.opts().file).toBe(bpmn.path);
        expect(program.opts().target).toBe(target);
        expect(program.opts().type).toBe(bpmn.type);
    });
});
