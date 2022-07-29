export interface Artifact {
    type: "bpmn" | "dmn" | "form" | "element-template" | "configuration",
    path: string,
    fileName: string,
    project: string
}

export interface DeployArtifact {
    artifact: Artifact,
    target: string
}
