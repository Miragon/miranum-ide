import { WebviewApi } from "vscode-webview";
import { VscMessage, VscState } from "@miranum-ide/vscode/miranum-vscode-webview";
import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-forms";

export interface State extends VscState<FormBuilderData> {
    mode: string;
    data?: FormBuilderData;
}
export class StateController {
    private vscode: WebviewApi<State>;

    constructor() {
        this.vscode = acquireVsCodeApi();
    }

    public getState(): State | undefined {
        return this.vscode.getState();
    }

    public setState(state: State) {
        this.vscode.setState(state);
    }

    public updateState(state: State) {
        this.setState({
            ...state,
        });
    }

    public postMessage(message: VscMessage<FormBuilderData>) {
        this.vscode.postMessage(message);
    }
}
