export class NoMiranumJsonFoundError extends Error {
    constructor(path: string) {
        super(`No \`miranum.json\` found in the workspace ${path}.`);
    }
}

export class NoMiranumConfigFoundError extends Error {
    constructor(type: string) {
        super(`No configuration for type \`${type}\` found in \`miranum.json\`.`);
    }
}
