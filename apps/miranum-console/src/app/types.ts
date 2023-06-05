import { MiranumConfig } from "@miranum-ide/miranum-core";

export interface Cache {
    name: string;
    type?: string;
    path: string;
}

export interface MessageEvent {
    type: string;
    command: string;
    data: MessageData;
}

interface MessageData extends Cache {
    miranumJson?: MiranumConfig;
}
