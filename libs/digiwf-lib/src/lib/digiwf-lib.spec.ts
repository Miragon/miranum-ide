import { deployAllArtifacts, deployArtifact, digiwfLib } from "./digiwf-lib";

const pathToProject = "resources/my-process-automation-project/";
const project = "my-process-automation-project";
const target = "http://localhost:8080";

describe("digiwfLib", () => {
    it("should work", () => {
        expect(digiwfLib()).toEqual("digiwf-lib");
    });
});

describe("deployArtifact", () => {
    it("should work", async () => {
        const file = `${pathToProject}my-process.bpmn`;
        const type = "BPMN";

        const artifact = await deployArtifact(file, type, project, target);

        expect(artifact.type).toEqual(type);
        expect(artifact.project).toEqual(project);
        expect(artifact.path).toEqual(file);
        expect(artifact.file).not.toBeNull();
    });

    it("should raise an error", async () => {
        return deployArtifact(pathToProject, "BPMN", project, target)
            .catch(e => expect(e).not.toBeNull());
    });
});

describe("deployAllArtifacts", () => {
    it("should work", async () => {
        const target = "http://localhost:8080";

        const artifacts = await deployAllArtifacts(pathToProject, project, target);

        artifacts.forEach(artifact => {
            expect(artifact.type).not.toBeNull();
            expect(artifact.project).toEqual(project);
            expect(artifact.path).toContain(pathToProject);
            expect(artifact.file).not.toBeNull();
        });
    });

    it("should raise an error", async () => {
        return deployAllArtifacts("/path/does-not/exist", project, target)
            .catch(e => expect(e).not.toBeNull());
    });
});
