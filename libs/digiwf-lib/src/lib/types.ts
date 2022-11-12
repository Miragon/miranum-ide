export interface Artifact {
    type: string,
    project: string,
    file: FileDetails
}

export interface FileDetails {
    name: string;
    extension: string;
    content: string;
    size?: number;
    pathInProject?: string;
}

export interface DigiwfConfig {
    projectVersion: string,
    name: string;
    workspace: object;
    deployment: DigiWFDeploymentPlugin[];
}

export interface DigiWFDeploymentPlugin {
    plugin: string;
    targetEnvironments: DigiWFDeploymentTarget[];
    deploy(target: string, artifact: Artifact): Promise<Artifact>;
}

export interface DigiWFGeneratorPlugin {
    type: string;
    fileExtension: string;
    template: string;
    basePath: string | undefined;
    defaultData: object;
    generate(name: string, project: string): Promise<Artifact>
}

export interface DigiWFDeploymentTarget {
    name: string;
    url: string;
}
