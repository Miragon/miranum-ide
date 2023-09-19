import { WebviewApi } from "vscode-webview";
import { MessageType, VscMessage, VscState } from "./types";
import { isArray, mergeWith, reverse, uniqBy } from "lodash";

type Subset<K> = {
    [attr in keyof K]?: K[attr] extends object ? Subset<K[attr]> : K[attr];
};

export interface VsCode<T> {
    getState(): VscState<T> | undefined;

    setState(state: VscState<T>): void;

    updateState(state: Subset<VscState<T>>): void;

    postMessage(message: VscMessage<T>): void;
}

export class VsCodeImpl<T> implements VsCode<T> {
    private vscode: WebviewApi<VscState<T>>;

    constructor() {
        this.vscode = acquireVsCodeApi();
    }

    public getState(): VscState<T> | undefined {
        return this.vscode.getState();
    }

    public setState(state: VscState<T>) {
        this.vscode.setState(state);
    }

    public updateState(state: Subset<VscState<T>>) {
        function customizer(objValue: any, srcValue: any): any {
            if (isArray(objValue)) {
                return reverse(uniqBy(reverse(objValue.concat(srcValue)), "type"));
            }
        }

        const newState = mergeWith(this.getState(), state, customizer);
        this.setState({
            ...newState,
        });
    }

    public postMessage(message: VscMessage<T>) {
        this.vscode.postMessage(message);
    }
}

export class VsCodeMock<T> implements VsCode<T> {
    constructor(
        private readonly viewType: string,
        private readonly response: T,
    ) {}

    getState(): VscState<T> | undefined {
        return undefined;
    }

    postMessage(msg: VscMessage<T>): void {
        const { type, data, message } = msg;
        switch (type) {
            case `${this.viewType}.${MessageType.INITIALIZE}`: {
                console.log("[Log] postMessage()", type, message);
                window.dispatchEvent(
                    new MessageEvent("message", {
                        data: {
                            type: `${this.viewType}.${MessageType.INITIALIZE}`,
                            data: this.response,
                        },
                    }),
                );
                break;
            }
            case `${this.viewType}.${MessageType.MSGFROMWEBVIEW}`: {
                console.log("[Log] postMessage()", type, data);
                break;
            }
            case `${this.viewType}.${MessageType.ERROR}`: {
                console.error("[Log] postMessage()", type, message);
                break;
            }
            case `${this.viewType}.${MessageType.INFO}`: {
                console.log("[Log] postMessage()", type, message);
                break;
            }
        }
    }

    setState(state: VscState<T>): void {
        console.log("[Log] setState():", state);
    }

    updateState(state: Subset<VscState<T>>): void {
        console.log("[Log] updateState():", state);
    }
}
