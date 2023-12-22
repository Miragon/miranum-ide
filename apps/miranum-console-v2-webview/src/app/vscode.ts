/**
 * This module contains everything related to the vscode API.
 */
import { WebviewApi } from "vscode-webview";
import {
    Command,
    GetImagePathCommand,
    GetLatestWorkspaceCommand,
    ImagePath,
    ImagePathQuery,
    LatestWorkspaceQuery,
    LogErrorCommand,
    LogInfoCommand,
    Query,
    Workspace,
} from "@miranum-ide/vscode/miranum-vscode-webview";

export interface VscState {
    images: ImagePath[];
    latestProjects: Workspace[];
}

type MessageType = Command | Query;

export interface VsCode {
    getState(): VscState;

    setState(state: VscState): void;

    updateState(state: Partial<VscState>): void;

    postMessage(message: MessageType): void;
}

export class MissingStateError extends Error {
    constructor() {
        super("State is missing.");
    }
}

export class VsCodeImpl implements VsCode {
    private vscode: WebviewApi<VscState>;

    constructor() {
        this.vscode = acquireVsCodeApi();
    }

    public getState(): VscState {
        const state = this.vscode.getState();
        if (!state) {
            throw new MissingStateError();
        }

        return state;
    }

    public setState(state: VscState) {
        this.vscode.setState({
            ...state,
        });
    }

    public updateState(state: Partial<VscState>) {
        this.setState({
            ...this.getState(),
            ...state,
        });
    }

    public postMessage(message: MessageType) {
        console.log("[Send Message]", message.type);
        this.vscode.postMessage(message);
    }
}

/**
 * To simplify the development of the webview, we allow it to run in the browser.
 * For this purpose, the functionality of the extension/backend is mocked.
 */
export class VsCodeMock implements VsCode {
    private state: VscState | undefined;

    getState(): VscState {
        if (!this.state) {
            throw new MissingStateError();
        }

        return this.state;
    }

    async postMessage(message: MessageType): Promise<void> {
        switch (true) {
            case message instanceof GetLatestWorkspaceCommand: {
                console.log("[Log] Webview is fully loaded.");
                const latestProjects = new LatestWorkspaceQuery([
                    new Workspace("my-project", "some/path"),
                    new Workspace("migrate-working-times", "some/path"),
                    new Workspace("migrate-persons", "some/path"),
                    new Workspace("restaurant-process", "some/path"),
                    new Workspace("order-example", "some/path"),
                    new Workspace("ticket-ordering", "some/path"),
                    new Workspace("morning-routine", "some/path"),
                    new Workspace("pizza-ordering", "some/path"),
                    new Workspace("maintenance", "some/path"),
                    new Workspace("tire-exchange", "some/path"),
                ]);
                window.dispatchEvent(
                    new MessageEvent("message", {
                        data: latestProjects,
                    }),
                );
                break;
            }
            case message instanceof GetImagePathCommand: {
                window.dispatchEvent(
                    new MessageEvent("message", {
                        data: new ImagePathQuery([]),
                    }),
                );
                break;
            }
            case message instanceof LogErrorCommand: {
                console.error("[Log]", (message as LogErrorCommand).message);
                break;
            }
            case message instanceof LogInfoCommand: {
                console.log("[Log]", (message as LogInfoCommand).message);
                break;
            }
            default: {
                console.log("[Send Message]", message);
            }
        }
    }

    setState(state: VscState): void {
        this.state = state;
        console.log("[Log] setState()", this.getState());
    }

    updateState(state: Partial<VscState>): void {
        const currentState = this.getState();
        let latestProjects: Workspace[];
        if (state?.latestProjects) {
            latestProjects = state.latestProjects;
        } else {
            latestProjects = currentState.latestProjects;
        }
        let images: ImagePath[];
        if (state?.images) {
            images = state.images;
        } else {
            images = currentState.images;
        }

        this.state = {
            images,
            latestProjects,
        };

        console.log("[Log] updateState()", this.getState());
    }
}
