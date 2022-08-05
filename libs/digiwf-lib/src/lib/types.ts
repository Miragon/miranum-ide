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
