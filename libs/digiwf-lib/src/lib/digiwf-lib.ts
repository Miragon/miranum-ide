import { Artifact, DigiwfConfig, DigiWFDeploymentPlugin, DigiWFGeneratorPlugin } from "./types";
import { availableGeneratorPlugins } from "./generate/plugins";

export function createDigiwfLib(projectVersion: string, projectName: string, workspace: object, deployment: DigiWFDeploymentPlugin[]): DigiwfLib {
    return new DigiwfLib({
        projectVersion: projectVersion,
        name: projectName,
        workspace: workspace,
        deployment: deployment
    });
}

const supportedTypes = ["bpmn", "dmn", "form", "config"];
/**
 * If the type is supported for deployment the function returns true
 * @param type: type of the artifact that is to be deployed
 */
export function checkIfSupportedType(type: string): boolean {
    if (!supportedTypes.includes(type.toLowerCase())) {
        console.log(`${type} is not supported for deployment`);
        return false;
    }
    return true;
}

// observer pattern
// https://en.wikipedia.org/wiki/Observer_pattern#Java
export class DigiwfLib {
    projectConfig?: DigiwfConfig;
    generatorPlugins: Map<string, DigiWFGeneratorPlugin> = availableGeneratorPlugins;

    constructor(config?: DigiwfConfig) {
        this.projectConfig = config
    }

    public async deploy(target: string, artifact: Artifact): Promise<Artifact> {
        if (!this.projectConfig) {
            throw new Error("Config not available. Please initialize digiwfLib with a valid config");
        }

        if(!checkIfSupportedType(artifact.type)) {
            throw new Error(`Unable to Deploy ${artifact.type}`);
        }

        await Promise.all(
            this.projectConfig.deployment.map(plugin => plugin.deploy(target, artifact))
        );
        return artifact;
    }

    public async initProject(projectName: string): Promise<Artifact[]> {
        const filesToGenerate = [
            {name: projectName, type: "process-ide.json"},
            {name: projectName, type: "bpmn"},
            // {name: name, type: "dmn"}
            {name: `${projectName}_start`, type: "form"},
            {name: `${projectName}_control`, type: "form"},
            {name: `${projectName}_dev`, type: "config"},
            {name: `${projectName}_prod`, type: "config"},
            {name: "element-templates", type: ".gitkeep"},
            {name: `${projectName}`, type: "README.md"}
        ];
        const generatedFiles = [];
        for (const file of filesToGenerate) {
            generatedFiles.push(await this.generateArtifact(file.name, file.type, projectName));
        }
        return generatedFiles;
    }

    public async generateArtifact(artifactName: string, type: string, project: string): Promise<Artifact> {
        const generator = this.generatorPlugins.get(type);
        if (!generator) {
            throw new Error(`File type ${type} is not supported.`);
        }
        return generator.generate(artifactName, project, this.getPathFromConfig(type));
    }

    private getPathFromConfig(type: string): string | undefined {
        if (this.projectConfig) {
            switch (type){
                case "form": {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    return this.projectConfig.workspace["forms"];
                }
                case "config": {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    return this.projectConfig.workspace["processConfigs"];
                }
                case "element-template": {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    return this.projectConfig.workspace["elementTemplates"];
                }
            }
        }
        return undefined;
    }

}
