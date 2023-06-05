import { Artifact } from "@miranum-ide/miranum-core";

export interface ConsoleData {
    command: string;
    fileData: FileData;
    miranumJson?: string;
}

interface FileData {
    name: string;
    path: string;
    type?: string;
    artifact?: Artifact | Artifact[];
}
