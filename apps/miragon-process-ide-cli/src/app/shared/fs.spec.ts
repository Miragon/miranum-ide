import { getFile, getFiles } from "./fs";

const pathToProject = "resources/my-process-automation-project/";

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
    it("should work", async () => {
        const files = await getFiles(pathToProject);

        files.forEach(fileDetails => {
            expect(fileDetails.name).not.toBeNull();
            expect(fileDetails.extension).not.toBeNull();
            expect(fileDetails.content).not.toBeNull();
            expect(fileDetails.size).toBeGreaterThan(0);
        });
    });

    it("should raise an error", async () => {
        return getFile(pathToProject)
            .catch(e => expect(e).not.toBeNull());
    });
});
