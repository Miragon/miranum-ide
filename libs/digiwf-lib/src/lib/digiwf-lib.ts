import { Artifact, DigiwfConfig, DigiWFDeploymentPlugin, DigiWFGeneratorPlugin } from "./types";
import { availableDeploymentPlugins } from "./deployment/plugins";
import { availableGeneratorPlugins } from "./generate/plugins";

// observer pattern
// https://en.wikipedia.org/wiki/Observer_pattern#Java
export class DigiwfLib {
    deploymentPlugins: DigiWFDeploymentPlugin[] = availableDeploymentPlugins;
    generatorPlugins: DigiWFGeneratorPlugin[] = availableGeneratorPlugins;

    constructor(config?: DigiwfConfig) {
        if (config) {
            this.deploymentPlugins = config.deploymentPlugins;
            this.generatorPlugins = config.generatorPlugins;
        }
    }

    public async deploy(target: string, artifact: Artifact): Promise<Artifact> {
        await Promise.all(
            this.deploymentPlugins.map(plugin => plugin.deploy(target, artifact))
        );
        return artifact;
    }

    public async initProject(projectName: string): Promise<Artifact[]> {
        const filesToGenerate = [
            {name: projectName, type: "bpmn"},
            // {name: name, type: "dmn"}
            {name: "start", type: "form"},
            {name: "control", type: "form"},
            {name: "dev", type: "config"},
            {name: "prod", type: "config"},
            {name: "element-templates", type: ".gitkeep"},
            {name: "README.md", type: "README.md"}
        ];
        const generatedFiles = [];
        for (const file of filesToGenerate) {
            generatedFiles.push(await this.generateArtifact(file.name, file.type));
        }
        return generatedFiles;
    }

    public async generateArtifact(artifactName: string, type: string): Promise<Artifact> {
        const generator = this.generatorPlugins.find(generator => generator.type === type);
        if (!generator) {
            throw new Error(`File type ${type} is not supported.`);
        }
        return generator.generate(artifactName, type);
    }

}
