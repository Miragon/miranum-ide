import { MiranumConfig } from "@miranum-ide/miranum-core";

export interface Cache {
    name: string;
    type?: string;
    path: string;
}

export interface MessageData extends Cache {
    miranumJson?: MiranumConfig;
}

export enum TreeItemType {
    DEFAULT = "default",
    DEPLOY = "deploy",
}

// TODO: Find a better way
export const miranumCommands = new Map<string, Map<string, string>>([
    [
        "Deploy All",
        new Map<string, string>([
            ["Local", "miranum.deployAll.local"],
            ["Dev", "miranum.deployAll.dev"],
            ["Test", "miranum.deployAll.test"],
        ]),
    ],
    [
        "Deploy",
        new Map<string, string>([
            ["Local", "miranum.deploy.local"],
            ["Dev", "miranum.deploy.dev"],
            ["Test", "miranum.deploy.test"],
        ]),
    ],
]);
