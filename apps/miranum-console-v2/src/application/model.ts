import { Artifact, Engine } from "@miranum-ide/vscode/miranum-vscode-webview";

export class MiranumWorkspace {
    public readonly name: string;

    public readonly path: string;

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
    }

    compare(other: MiranumWorkspace): boolean {
        return this.name === other.name && this.path === other.path;
    }
}

export class NewMiranumWorkspace {
    public readonly project: MiranumWorkspace;

    public readonly artifacts: Set<Artifact>;

    public readonly engine: Engine;

    constructor(project: MiranumWorkspace, artifacts: Set<Artifact>, engine: Engine) {
        this.project = project;
        this.artifacts = artifacts;
        this.engine = engine;
    }
}
