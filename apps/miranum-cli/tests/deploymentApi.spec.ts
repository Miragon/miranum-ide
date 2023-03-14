import { deployAllFiles, deployFile } from "../src/app/deployment/api";
import { filesToDeploy, pathToProject, shouldNotWork, sleep } from "./testHelpers";
// import axios from "axios";
// import * as colors from "colors";

const appPath = "dist/apps/miranum-clid/main.js";
const target = "local"

jest.setTimeout(30000);
// jest.mock("axios");
// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// axios.get.mockResolvedValue({ data: {success: true} });

describe("deploy all files", () => {
    it(`deploying my-process-automation-project e2e should work`, async () => {
        // const logSpy = jest.spyOn(console, "log");
        const program = deployAllFiles();
        program.parse(["node", appPath, "deploy", "--directory", pathToProject, "--target", target]);

        await sleep(3000);
        expect(program.args).toEqual(["deploy"]);
        expect(program.opts().directory).toBe(pathToProject);
        expect(program.opts().target).toBe(target);
        // expect(logSpy).toHaveBeenCalledWith(`Project my-process-automation-project was successfully deployed to environment ${target}`);
        // for(const file of filesToDeploy) {
        //     expect(logSpy).toHaveBeenCalledWith(colors.green.bold("DEPLOYED ") + file.nameExt + " to environment " + target);
        // }
    });

    it("should not work, due to unknown option", () => {
        shouldNotWork(deployAllFiles(), "deploy",
            ["node", appPath, "deploy", "--directory", pathToProject, "--target", target, "--randomArgument"],
            "error: unknown option '--randomArgument'"
        );
    });

    it(`should not work, due to missing argument`, async () => {
        shouldNotWork(deployAllFiles(), "deploy",
            ["node", appPath, "deploy", "--directory", pathToProject],
            "error: required option '-t, --target <target>' not specified"
        );
    });
});


describe("deploy files", () => {
    for (const file of filesToDeploy) {
        it(`${file.type} should work`, async () => {
            // const logSpy = jest.spyOn(console, "log");
            const program = deployFile();
            program.parse(["node", appPath, "deploy-file", "--file", file.path, "--target", target, "--type", file.type]);

            await sleep(1500);
            expect(program.args).toEqual(["deploy-file"]);
            expect(program.opts().file).toBe(file.path);
            expect(program.opts().target).toBe(target);
            expect(program.opts().type).toBe(file.type);
            // expect(logSpy).toHaveBeenCalledWith(colors.green.bold("DEPLOYED ") + file.nameExt + " to environment " + target);
        });
    }

    it(`should not work, due to wrong type`, async () => {
        const miranumJson = {path: "resources/my-process-automation-project/miranum.json", type: "json"}
        shouldNotWork(deployFile(), "deploy-file",
            ["node", appPath, "deploy-file", "--file", miranumJson.path, "--target", target, "--type", miranumJson.type],
            "type must be either bpmn, dmn, form or config"
        );
    });

    it("should not work, due to unknown option", () => {
        shouldNotWork(deployFile(), "deploy-file",
            ["node", appPath, "deploy-file", "--file", filesToDeploy[0].path, "--target", target, "--type", filesToDeploy[0].type, "--randomArgument"],
            "error: unknown option '--randomArgument'"
        );
    });

    it(`should not work, due to missing argument`, async () => {
        shouldNotWork(deployFile(), "deploy-file",
            ["node", appPath, "deploy-file", "--file", filesToDeploy[0].path, "--type", filesToDeploy[0].type],
            "error: required option '-t, --target <target>' not specified"
        );
    });
});
