export class NoWorkspaceFolderFoundError extends Error {
    constructor() {
        super("No workspace folder found.");
    }
}

export class NoMiranumConfigFoundError extends Error {
    constructor() {
        super("No miranum.json file found.");
    }
}

export class NoMiranumWorkspaceItemError extends Error {
    constructor(type: string) {
        super(`No configuration for type \`${type}\` found in \`miranum.json\`.`);
    }
}

export class FileNotFound extends Error {
    constructor(path: string) {
        super(`File not found: ${path}`);
    }
}

export class UnableToCreateWatcherError extends Error {
    constructor(webviewId?: string, reason?: string) {
        super(`Unable to create watcher for webview ${webviewId}. ${reason}`);
    }
}

export class NoChangesToApplyError extends Error {
    constructor(editorId: string) {
        super(`No changes to apply for ${editorId}.`);
    }
}
