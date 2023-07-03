import { MiranumConfig } from "@miranum-ide/miranum-core";

export interface Cache {
    name: string;
    type?: string;
    path: string;
}

export interface MessageData extends Cache {
    miranumJson?: MiranumConfig;
}
