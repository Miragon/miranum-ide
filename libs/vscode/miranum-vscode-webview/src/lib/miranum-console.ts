import { Command, Query } from "./common";

export class Workspace {
    public readonly name: string;

    public readonly path: string;

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
    }
}

// Queries
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MiranumConsoleQuery extends Query {}

export class LatestWorkspaceQuery implements MiranumConsoleQuery {
    public readonly type: string = "LatestWorkspaceQuery";

    public readonly latestWorkspaces: Workspace[];

    constructor(latestWorkspaces: Workspace[]) {
        this.latestWorkspaces = latestWorkspaces;
    }
}

export class NewWorkspacePathQuery implements MiranumConsoleQuery {
    public readonly type: string = "NewWorkspacePathQuery";

    public readonly path: string;

    constructor(path: string) {
        this.path = path;
    }
}

// Commands
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MiranumConsoleCommand extends Command {}

export class GetLatestWorkspaceCommand implements MiranumConsoleCommand {
    public readonly type: string = "GetLatestWorkspaceCommand";
}

export class OpenWorkspaceDialogCommand implements MiranumConsoleCommand {
    public readonly type: string = "OpenWorkspaceDialogCommand";
}

export class OpenWorkspaceCommand implements MiranumConsoleCommand {
    public readonly type: string = "OpenWorkspaceCommand";

    public readonly workspace: Workspace;

    constructor(workspace: Workspace) {
        this.workspace = workspace;
    }
}

export class GetPathForNewWorkspaceCommand implements MiranumConsoleCommand {
    public readonly type: string = "GetPathForNewWorkspaceCommand";
}

export enum Artifact {
    DMN = "dmn",
    ELEMENT_TEMPLATE = "element-template",
    FORM = "form",
}

export enum Engine {
    C7 = "c7",
    C8 = "c8",
}

export class CreateNewWorkspaceCommand implements MiranumConsoleCommand {
    public readonly type: string = "CreateNewWorkspaceCommand";

    public readonly workspace: Workspace;

    public readonly artifacts: Artifact[];

    public readonly engine: Engine;

    constructor(workspace: Workspace, artifacts: Artifact[], engine: Engine) {
        this.workspace = workspace;
        this.artifacts = artifacts;
        this.engine = engine;
    }
}
