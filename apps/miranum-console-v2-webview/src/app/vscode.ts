/**
 * This module contains everything related to the vscode API.
 */
import { WebviewApi } from "vscode-webview";
import {
    LoggerMessage,
    MessageType as MiranumMessageType,
} from "@miranum-ide/vscode/miranum-vscode-webview";
import { MiranumConsoleDto, Project } from "./types";

export interface VscState {
    latestProjects: Project[];
}

export interface VsCode {
    getState(): VscState;

    setState(state: VscState): void;

    updateState(state: Partial<VscState>): void;

    postMessage(message: MiranumConsoleDto | LoggerMessage): void;
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

    public postMessage(message: MiranumConsoleDto | LoggerMessage) {
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

    async postMessage(message: MiranumConsoleDto | LoggerMessage): Promise<void> {
        const miranumConsoleDto = message as MiranumConsoleDto;
        const loggerMessage = message as LoggerMessage;

        switch (message.type) {
            case MiranumMessageType.INITIALIZE: {
                console.log("[Log] Webview is fully loaded.");
                const latestProjects = [
                    new Project("my-project", "some/path"),
                    new Project("migrate-working-times", "some/path"),
                    new Project("migrate-persons", "some/path"),
                    new Project("restaurant-process", "some/path"),
                    new Project("order-example", "some/path"),
                    new Project("ticket-ordering", "some/path"),
                    new Project("morning-routine", "some/path"),
                    new Project("pizza-ordering", "some/path"),
                    new Project("maintenance", "some/path"),
                    new Project("tire-exchange", "some/path"),
                ];
                window.dispatchEvent(
                    new MessageEvent("message", {
                        data: {
                            type: MiranumMessageType.INITIALIZE,
                            data: JSON.stringify(latestProjects),
                        },
                    }),
                );
                break;
            }
            case MiranumMessageType.ERROR: {
                console.error("[Log]", loggerMessage.log);
                break;
            }
            case MiranumMessageType.INFO: {
                console.log("[Log]", loggerMessage.log);
                break;
            }
            default: {
                console.log("[Send Message]", miranumConsoleDto.payload);
            }
        }
    }

    setState(state: VscState): void {
        this.state = state;
        console.log("[Log] setState()", this.getState());
    }

    updateState(state: Partial<VscState>): void {
        const currentState = this.getState();
        let latestProjects: Project[];
        if (state?.latestProjects) {
            latestProjects = state.latestProjects;
        } else {
            latestProjects = currentState.latestProjects;
        }

        this.state = {
            latestProjects,
        };

        console.log("[Log] updateState()", this.getState());
    }
}
