import { WebviewApi } from "vscode-webview";
import { VscMessage, VscState } from "../types/types";
import { isArray, mergeWith, reverse, uniqBy } from "lodash";

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

    public updateState(state: Subset<VscState>) {
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

    public postMessage(message: VscMessage) {
        this.vscode.postMessage(message);
    }
}

type Subset<K> = {
    [attr in keyof K]?: K[attr] extends object ? Subset<K[attr]> : K[attr];
};
