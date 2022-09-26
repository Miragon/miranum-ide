export interface Artifact {
    type: string,
    project: string,
    path: string,
    file: FileDetails
}

export interface FileDetails {
    name: string,
    extension: string,
    content: string
    size: number
}

export interface DigiWFDeploymentPlugin {
    name: string;
    targetEnvironments: DigiWFDeploymentTarget[];
    deploy(target: string, artifact: Artifact): Promise<Success>;
}

export interface DigiWFDeploymentTarget {
    name: string;
    url: string;
}

export interface Success {
    success: boolean;
    message: string | undefined;
}
