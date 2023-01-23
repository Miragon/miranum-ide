import { availableGeneratorPlugins } from "./plugins";
import {Artifact} from "../types";

interface FileHelper {
    name: string;
    type: string;
    extension: string;
    dir: string;
}

const filesToGenerate: FileHelper[] = [
    {name: "my-process", type: "bpmn", extension: "bpmn", dir: ""},
    {name: "my-decision-table", type: "dmn", extension: "dmn", dir: ""},
    {name: "my-form", type: "form", extension: "form", dir: "forms"},
    {name: "my-config", type: "config", extension: "config", dir: "configs"},
    {name: "my-element-template", type: "element-template", extension: "json", dir: "element-templates"},
    {name: "miranum", type: "miranum.json", extension: "json", dir: ""},
    {name: "README", type: "README.md", extension: "md", dir: ""},
    {name: " ", type: ".gitkeep", extension: "gitkeep", dir: "element-templates"}
];

describe("generators with miranum-core", () => {
    for (const file of filesToGenerate) {
        it(`${file.type} generator should work`, async () => {
            const generator = getGenerator(file.type);

            // check file creation
            const artifact = await generator.generate(file.name, "test-project");
            compareArtifactFile(artifact, file);
            expect(artifact.project).toEqual("test-project");
            expect(artifact.file.pathInProject).toEqual(`/${file.dir}/${file.name}.${file.extension}`.replace("//", "/"));
        });
    }
});

describe("generators without miranum-core", () => {
    for (const file of filesToGenerate) {
        it(`${file.type} generator should work`, async () => {
            const generator = getGenerator(file.type);

            const artifact = await generator.generate(file.name, "", "");
            compareArtifactFile(artifact, file);
            expect(artifact.file.pathInProject).toEqual(`/${file.name}.${file.extension}`);
        });
    }
})

//   -------------------------HELPERS-------------------------   \\
function getGenerator(type: string) {
    // check if generator exists
    expect(availableGeneratorPlugins.get(type)).toBeTruthy();

    const generator = availableGeneratorPlugins.get(type);
    if (!generator) {
        fail("Generator does not exist");
    }
    return generator;
}

function compareArtifactFile(artifact:Artifact, file: FileHelper) {
    expect(artifact.type).toEqual(file.type);
    expect(artifact.file.name).toEqual(file.name);
    expect(artifact.file.extension).toEqual(file.extension);
}
