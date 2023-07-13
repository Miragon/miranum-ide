import { Artifact, MiranumConfig } from "@miranum-ide/miranum-core";

export interface ConsoleData {
    command: string;
    fileData: FileData;
    miranumJson?: MiranumConfig;
}

export interface FileData {
    name?: string;
    path?: string;
    type?: string;
    artifact?: Artifact | Artifact[];
}

export enum MessageType {
    SHOW = "show",
    GENERATEPROJECT = "generateProject",
    GENERATEARTIFACT = "generateArtifact",
    OPENFILEPICKER = "openFilePicker",
    CHANGEDINPUT = "changedInput",
}
