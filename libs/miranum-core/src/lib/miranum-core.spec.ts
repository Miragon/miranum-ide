import { createMiranumCore, MiranumCore } from "./miranum-core";
import { Artifact, MiranumWorkspaceItem } from "./types";

const sampleTarget = "local";
const workspace: MiranumWorkspaceItem[] = [
    { type: "bpmn", path: "", extension: ".bpmn" },
    { type: "dmn", path: "", extension: ".dmn" },
    { type: "form", path: "forms", extension: ".form" },
    { type: "element-template", path: "element-templates", extension: ".json" },
    { type: "config", path: "configs", extension: ".config.json" },
];
const deploymentPlugin = [
    {
        plugin: "dry",
        targetEnvironments: [
            {
                name: "local",
                url: "http://localhost:8080",
            },
            {
                name: "dev",
                url: "http://localhost:8080",
            },
            {
                name: "test",
                url: "http://localhost:8080",
            },
        ],
        async deploy(target: string, artifact: Artifact): Promise<Artifact> {
            return artifact;
        },
    },
];
const miranumCore: MiranumCore = createMiranumCore(
    "1.0.0",
    "my-project",
    workspace,
    deploymentPlugin,
);

describe("deploy", () => {
    it("should work", async () => {
        const exampleArtifact = {
            type: "BPMN",
            project: "exampleProject",
            file: {
                name: "example.bpmn",
                extension: ".bpmn",
                content: "...",
                size: 500,
            },
        };

        const deployment = await miranumCore.deploy(sampleTarget, exampleArtifact);

        expect(deployment).toEqual(exampleArtifact);
    });

    it("should not be a supported type", async () => {
        const exampleArtifact = {
            type: "test",
            project: "exampleProject",
            file: {
                name: "example.bpmn",
                extension: ".bpmn",
                content: "...",
                size: 500,
            },
        };
        await miranumCore
            .deploy(sampleTarget, exampleArtifact)
            .catch((e) => expect(e).not.toBeNull());
    });
});

describe("generate", () => {
    interface FileHelper {
        name: string;
        type: string;
        extension: string;
        dir: string;
    }

    const filesToGenerate: FileHelper[] = [
        { name: "my-process", type: "bpmn", extension: ".bpmn", dir: "" },
        { name: "my-decision-table", type: "dmn", extension: ".dmn", dir: "" },
        { name: "my-form", type: "form", extension: ".form", dir: "forms" },
        { name: "my-config", type: "config", extension: ".config.json", dir: "configs" },
        {
            name: "my-element-template",
            type: "element-template",
            extension: ".json",
            dir: "element-templates",
        },
    ];

    for (const file of filesToGenerate) {
        it(`generate ${file.type} on top-level`, async () => {
            const artifact = await miranumCore.generateArtifact(
                file.name,
                file.type,
                "my-project",
                "imaginary/path/my-project",
            );
            // name, type, and extension are tested in plugisn.spec.ts
            expect(artifact.project).toEqual("my-project");
            expect(artifact.file.pathInProject).toEqual(
                `${file.dir}/${file.name}${file.extension}`,
            );
        });

        it(`generate ${file.type} in subfolder`, async () => {
            const artifact = await miranumCore.generateArtifact(
                file.name,
                file.type,
                "my-project",
                "imaginary/path/my-project/subfolder",
            );
            // name, type, and extension are tested in plugisn.spec.ts
            expect(artifact.project).toEqual("my-project");
            expect(artifact.file.pathInProject).toEqual(
                `/${file.name}${file.extension}`,
            );
        });
    }
});
