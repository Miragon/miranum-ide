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
    deploy(target: string, artifact: Artifact): Promise<DeploymentSuccess>;
}

export interface DigiWFDeploymentTarget {
    name: string;
    url: string;
}

export interface DeploymentSuccess {
    success: boolean;
    message: string | undefined;
}
