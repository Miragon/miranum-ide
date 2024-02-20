export class NoWorkspaceFolderFoundError extends Error {
    constructor() {
        super("No workspace folder found.");
    }
}

export class NoMiranumConfigFoundError extends Error {
    constructor(type: string) {
        super(`No configuration for type \`${type}\` found in \`miranum.json\`.`);
    }
}

export class FileNotFound extends Error {
    constructor(path: string) {
        super(`File not found: ${path}`);
    }
}
