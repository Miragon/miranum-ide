import { getFile, getFiles } from "./fs";
import { FileDetails } from "@miranum-ide/miranum-core";

const pathToProject = "resources/my-process-automation-project/";

function checkFiles(files: FileDetails[], fileExtension: string) {
    files.forEach(fileDetails => {
        expect(fileDetails.name).not.toBeNull();
        expect(fileDetails.extension).toEqual(fileExtension);
        expect(fileDetails.content).not.toBeNull();
        expect(fileDetails.size).toBeGreaterThan(0);
    });
}

describe("getFile",() => {
    it("should work", async () => {
        const fileDetails = await getFile(`${pathToProject}my-process.bpmn`);

        expect(fileDetails.name).toEqual("my-process.bpmn");
        expect(fileDetails.extension).toEqual(".bpmn");
        expect(fileDetails.content).not.toBeNull();
        expect(fileDetails.size).toBeGreaterThan(0);
    });

    it("should raise an error", async () => {
        return getFile(pathToProject)
            .catch(e => expect(e).not.toBeNull());
    });
});

describe("getFiles",() => {
    it("forms should work", async () => {
        const files = await getFiles(pathToProject, [".form"]);
        checkFiles(files, ".form");
    });

    it("configs should work", async () => {
        const files = await getFiles(`${pathToProject}configs/`, [".config.json"]);
        checkFiles(files, ".json");
        // special case if file extension is .<...>.json -> the file extension is .json and .<...> is part of the file name
        files.forEach(configs => {
            expect(configs.name.includes(".config")).toBeTruthy();
        });
    });

    it("bpmn should work", async () => {
        const files = await getFiles(pathToProject, [".bpmn"]);
        checkFiles(files, ".bpmn");
    });

    it("dmn should work", async () => {
        const files = await getFiles(pathToProject, [".dmn"]);
        checkFiles(files, ".dmn");
    });

    it("should raise an error", async () => {
        return getFile(pathToProject)
            .catch(e => expect(e).not.toBeNull());
    });
});
