import { MessageType as MiranumMessageType } from "@miranum-ide/vscode/miranum-vscode-webview";

export enum ConsoleMessageType {
    CREATE_PROJECT = "createProject",
    OPEN_FILE_PICKER = "openFilePicker",
    GET_PATH = "getPath",
    OPEN_PROJECT = "openProject",
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

export type MessageType = MiranumMessageType | ConsoleMessageType;

export class MiranumConsoleDto {
    public readonly type: MessageType;

    private readonly _project?: Project;

    private readonly _newProject?: NewProject;

    constructor(type: MessageType, project?: Project, newProject?: NewProject) {
        this.type = type;
        this._project = project;
        this._newProject = newProject;
    }

    public get payload(): Project | NewProject | undefined {
        switch (this.type) {
            case ConsoleMessageType.CREATE_PROJECT:
                return this._newProject;
            case ConsoleMessageType.OPEN_PROJECT:
                return this._project;
            default:
                return undefined;
        }
    }
}

export class Project {
    public readonly name: string;

    public readonly path: string;

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
    }
}

export class NewProject {
    private readonly _project: Project;

    private readonly _artifacts: Set<Artifact>;

    private readonly _engine: Engine;

    constructor(project: Project, artifacts: Set<Artifact>, engine: Engine) {
        this._project = project;
        this._artifacts = artifacts;
        this._engine = engine;
    }

    public get project(): Project {
        return this._project;
    }

    public get artifacts(): Set<Artifact> {
        return this._artifacts;
    }

    public get engine(): Engine {
        return this._engine;
    }
}
