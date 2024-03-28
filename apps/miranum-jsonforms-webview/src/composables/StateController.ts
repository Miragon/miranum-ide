import { WebviewApi } from "vscode-webview";
import { VsCode } from "./types";
import {
    FormBuilderData,
    VscMessage,
    VscState,
} from "@miranum-ide/vscode/shared/miranum-jsonforms";

export class StateController implements VsCode {
    private vscode: WebviewApi<VscState<FormBuilderData>>;

    constructor() {
        this.vscode = acquireVsCodeApi();
    }

    public getState(): VscState<FormBuilderData> | undefined {
        return this.vscode.getState();
    }

    public setState(state: VscState<FormBuilderData>) {
        this.vscode.setState(state);
    }

    public updateState(state: VscState<FormBuilderData>) {
        this.setState({
            ...state,
        });
    }

    public postMessage(message: VscMessage<FormBuilderData>) {
        this.vscode.postMessage(message);
    }
}
