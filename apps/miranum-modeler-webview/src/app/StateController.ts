import { WebviewApi } from "vscode-webview";
import { VscState } from "../types/VsCode";

export class StateController {

    constructor(
        private readonly vsc: WebviewApi<VscState>,
    ) {}

    public getState(): VscState {
        return this.vsc.getState() ?? {};
    }

    public setState(state: VscState) {
        this.vsc.setState(state);
    }

    public updateState(state: Partial<VscState>) {
        this.setState({
            ...this.getState(),
            ...state,
        });
    }
}
