/**
 * This module contains everything related to the vscode API.
 */
import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { WebviewApi } from "vscode-webview";

import jsonSchema from "../../assets/schema.json";
import jsonUiSchema from "../../assets/uischema.json";
import jsonData from "../../assets/data.json";
import {
    ConfigEditorData,
    MessageType,
    VscMessage,
} from "@miranum-ide/vscode/shared/miranum-config-editor";

export interface VscState {
    schema: JsonSchema;
    uischema: UISchemaElement;
    data: JSON;
}

export interface VsCode {
    getState(): VscState;

    setState(state: VscState): void;

    updateState(state: Partial<VscState>): void;

    postMessage(message: VscMessage<ConfigEditorData>): void;
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

    public postMessage(message: VscMessage<ConfigEditorData>) {
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

    async postMessage(message: VscMessage<ConfigEditorData>): Promise<void> {
        const { type, payload, logger } = message;
        switch (type) {
            case MessageType.initialize: {
                console.log("[Log]", logger);
                window.dispatchEvent(
                    new MessageEvent("message", {
                        data: {
                            type: MessageType.initialize,
                            payload: {
                                schema: JSON.stringify(jsonSchema),
                                uischema: JSON.stringify(jsonUiSchema),
                                data: JSON.stringify(jsonData),
                            },
                        },
                    }),
                );
                break;
            }
            case MessageType.syncDocument: {
                console.log(
                    "[Log] Send data to the backend...",
                    JSON.parse(payload?.data ?? '{ "data": "No data"}"'),
                );
                break;
            }
            case MessageType.error: {
                console.error("[Log]", logger);
                break;
            }
            case MessageType.info: {
                console.log("[Log]", logger);
                break;
            }
        }
    }

    setState(state: VscState): void {
        this.state = state;
        console.log("[Log] setState()", this.getState());
    }

    updateState(state: Partial<VscState>): void {
        const currentState = this.getState();
        let schema: JsonSchema;
        if (state?.schema) {
            schema = state.schema;
        } else {
            schema = currentState.schema;
        }
        let uischema: UISchemaElement;
        if (state?.uischema) {
            uischema = state.uischema;
        } else {
            uischema = currentState.uischema;
        }
        let data: JSON;
        if (state?.data) {
            data = state.data;
        } else {
            data = currentState.data;
        }

        this.state = {
            schema,
            uischema,
            data,
        };

        console.log("[Log] updateState()", this.getState());
    }
}
