/** Thrown when no VS Code workspace folder is found for a given document. */
export class NoWorkspaceFolderFoundError extends Error {
    constructor() {
        super("No workspace folder found.");
    }
}

/** Thrown when no `miranum.json` configuration file can be located. */
export class NoMiranumConfigFoundError extends Error {
    constructor() {
        super("No miranum.json file found.");
    }
}

/** Thrown when a `miranum.json` exists but has no entry for the requested type. */
export class NoMiranumWorkspaceItemError extends Error {
    constructor(type: string) {
        super(`No configuration for type \`${type}\` found in \`miranum.json\`.`);
    }
}

/** Thrown when a file cannot be found at the given path. */
export class FileNotFound extends Error {
    constructor(path: string) {
        super(`File not found: ${path}`);
    }
}

/** Thrown when a filesystem watcher cannot be created for a webview. */
export class UnableToCreateWatcherError extends Error {
    constructor(webviewId?: string, reason?: string) {
        super(`Unable to create watcher for webview ${webviewId}. ${reason}`);
    }
}

/** Thrown when the execution platform cannot be auto-detected from BPMN XML. */
export class ExecutionPlatformNotDetectedError extends Error {
    constructor() {
        super("The execution platform could not be detected.");
    }
}

/** Thrown when the user cancels a prompt (e.g. quick-pick). */
export class UserCancelledError extends Error {
    constructor() {
        super("The operation was cancelled by the user.");
    }
}
