import { Artifact, Engine, Workspace } from "@miranum-ide/vscode/miranum-vscode-webview";

export class NewWorkspace {
    public readonly workspace: Workspace;

    public readonly artifacts: Set<Artifact>;

    public readonly engine: Engine;

    constructor(workspace: Workspace, artifacts: Set<Artifact>, engine: Engine) {
        this.workspace = workspace;
        this.artifacts = artifacts;
        this.engine = engine;
    }
}
