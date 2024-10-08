import {
    Artifact,
    MiranumConfig,
    MiranumDeploymentPlugin,
    MiranumGeneratorPlugin,
    MiranumWorkspaceItem,
} from "./types";
import { availableGeneratorPlugins } from "./generate/plugins";

export function createMiranumCore(
    projectVersion: string,
    projectName: string,
    workspace: MiranumWorkspaceItem[],
    deployment: MiranumDeploymentPlugin[],
): MiranumCore {
    return new MiranumCore({
        projectVersion: projectVersion,
        name: projectName,
        workspace: workspace,
        deployment: deployment,
    });
}

// observer pattern
// https://en.wikipedia.org/wiki/Observer_pattern#Java
export class MiranumCore {
    projectConfig?: MiranumConfig;

    generatorPlugins: Map<string, MiranumGeneratorPlugin> = availableGeneratorPlugins;

    constructor(config?: MiranumConfig) {
        this.projectConfig = config;
    }

    public async deploy(target: string, artifact: Artifact): Promise<Artifact> {
        if (!this.projectConfig) {
            throw new Error(
                "Config not available. Please initialize digiwfLib with a valid config",
            );
        }

        if (!checkIfSupportedType(artifact.type)) {
            throw new Error(`Unable to Deploy ${artifact.type}`);
        }

        await Promise.all(
            this.projectConfig.deployment.map((plugin) =>
                plugin.deploy(target, artifact),
            ),
        );
        return artifact;
    }

    public async initProject(projectName: string): Promise<Artifact[]> {
        const filesToGenerate = [
            { name: "README", type: "README.md" },
            { name: "miranum", type: "miranum.json" },
            { name: projectName, type: "bpmn" },
            { name: `${projectName}_dev`, type: "config" },
            { name: `${projectName}_prod`, type: "config" },
            { name: " ", type: ".gitkeep" },
            { name: `${projectName}_start`, type: "form" },
            { name: `${projectName}_control`, type: "form" },
        ];
        const generatedFiles = [];
        for (const file of filesToGenerate) {
            generatedFiles.push(
                await this.initArtifact(file.name, file.type, projectName),
            );
        }
        return generatedFiles;
    }

    public async generateArtifact(
        artifactName: string,
        type: string,
        projectName: string,
        projectPath: string,
    ): Promise<Artifact> {
        /** First, checks if we have a projectConfig, with a valid workspace for the type && if we are on "root-level" of the project
         *  if true: initialise an artifact with the artifact.pathInProject set as the projectConfig.workspace defines it,
         *  otherwise: initialise the artifact as a standalone artifact
         */
        let pathInProject = "";
        const lastFolder = projectPath.substring(projectPath.lastIndexOf("/") + 1);

        // if project root folder
        if (this.projectConfig && lastFolder === projectName) {
            // finds the first item
            const miranumWorkspaceItem = this.projectConfig.workspace.find(
                (ws) => ws.type === type,
            );
            if (miranumWorkspaceItem) {
                pathInProject = miranumWorkspaceItem.path;
            }
        }
        return this.initArtifact(artifactName, type, projectName, pathInProject);
    }

    /**
     * @param artifactName name of the artifact
     * @param type type of the artifact
     * @param project name of the project
     * @param pathInProject if undefined, default/base path will be used => should only be undefined to generate a project
     * @private
     */
    private async initArtifact(
        artifactName: string,
        type: string,
        project: string,
        pathInProject?: string,
    ): Promise<Artifact> {
        const generator = this.generatorPlugins.get(type);
        if (!generator) {
            throw new Error(`File type ${type} is not supported.`);
        }

        let extension = undefined;
        // eslint-disable-next-line array-callback-return
        this.projectConfig?.workspace.find((workspace) => {
            if (workspace.type === type) {
                extension = workspace.extension;
            }
        });
        return generator.generate(artifactName, project, extension, pathInProject);
    }
}

const supportedTypes = ["bpmn", "dmn", "form", "config"];

/**
 * If the type is supported for deployment the function returns true
 * @param type type of the artifact that is to be deployed
 */
export function checkIfSupportedType(type: string): boolean {
    if (!supportedTypes.includes(type.toLowerCase())) {
        console.log(`${type} is not supported for deployment`);
        return false;
    }
    return true;
}
