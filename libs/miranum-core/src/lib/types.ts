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
    workspace: MiranumWorkspaceItem[];
    deployment: MiranumDeploymentPlugin[];
}

export interface MiranumWorkspaceItem {
    type: string;
    path: string;
    extension: string;
}

export interface MiranumDeploymentPlugin {
    plugin: string;
    targetEnvironments: MiranumDeploymentTarget[];
    deploy(target: string, artifact: Artifact): Promise<Artifact>;
}

export interface MiranumGeneratorPlugin {
    type: string;
    defaultFileExtension: string;
    template: string;
    basePath: string | undefined;
    defaultData: object;
    generate(name: string, project: string, extension?: string, pathInProject?: string): Promise<Artifact>
}

export interface MiranumDeploymentTarget {
    name: string;
    url: string;
}
