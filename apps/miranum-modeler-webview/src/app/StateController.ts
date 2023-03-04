import { WebviewApi } from "vscode-webview";
import { VscMessage, VscState } from "../types/VsCode";

export class StateController {

    private vscode: WebviewApi<VscState>;

    constructor() {
        this.vscode = acquireVsCodeApi();
    }

    public getState(): VscState | undefined {
        return this.vscode.getState();
    }

    public setState(state: VscState) {
        this.vscode.setState(state);
    }

    public updateState(state: Partial<VscState>) {
        this.setState({
            ...this.getState(),
            ...state,
        });
    }

    public postMessage(message: VscMessage) {
        this.vscode.postMessage(message);
    }
}
