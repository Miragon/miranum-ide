import {MessageType as MiranumMessageType} from "@miranum-ide/vscode/miranum-vscode-webview";

import {MiranumWorkspace, NewProject} from "../application/model";

export enum ConsoleMessageType {
    CREATE_PROJECT = "createProject",
    OPEN_FILE_PICKER = "openFilePicker",
    GET_PATH = "getPath",
    OPEN_PROJECT = "openProject",
}

export type MessageType = MiranumMessageType | ConsoleMessageType;

export class MiranumConsoleDto {
    public readonly type: MessageType;

    private readonly _project?: MiranumWorkspace;

    private readonly _newProject?: NewProject;

    constructor(type: MessageType, project?: MiranumWorkspace, newProject?: NewProject) {
        this.type = type;
        this._project = project;
        this._newProject = newProject;
    }

    public get payload(): MiranumWorkspace | NewProject | undefined {
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
