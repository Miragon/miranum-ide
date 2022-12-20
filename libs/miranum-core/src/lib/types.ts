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

export interface MiranumConfig {
    projectVersion: string,
    name: string;
    workspace: object;
    deployment: MiranumDeploymentPlugin[];
}

export interface MiranumDeploymentPlugin {
    plugin: string;
    targetEnvironments: MiranumDeploymentTarget[];
    deploy(target: string, artifact: Artifact): Promise<Artifact>;
}

export interface MiranumGeneratorPlugin {
    type: string;
    fileExtension: string;
    template: string;
    basePath: string | undefined;
    defaultData: object;
    generate(name: string, project: string, path?: string): Promise<Artifact>
}

export interface MiranumDeploymentTarget {
    name: string;
    url: string;
}
