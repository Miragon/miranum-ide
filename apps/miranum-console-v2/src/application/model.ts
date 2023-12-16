export class MiranumWorkspace {
    public readonly name: string

    public readonly path: string

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
    }
}

export enum Artifact {
    DMN = "dmn",
    ELEMENT_TEMPLATE = "elementTemplate",
    FORM = "form",
}

export enum Engine {
    C7 = "c7",
    C8 = "c8",
}

export class NewProject {
    public readonly project: MiranumWorkspace;

    public readonly artifacts: Set<Artifact>;

    public readonly engine: Engine;

    constructor(project: MiranumWorkspace, artifacts: Set<Artifact>, engine: Engine) {
        this.project = project;
        this.artifacts = artifacts;
        this.engine = engine;
    }
}
