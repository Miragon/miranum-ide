import { WebviewApi } from "vscode-webview";
import { VscMessage, VscState } from "@miranum-ide/vscode/miranum-vscode-webview";
import { isArray, mergeWith, reverse, uniqBy } from "lodash";
import { ModelerData } from "@miranum-ide/vscode/shared/miranum-modeler";

type State = VscState<ModelerData>;

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

    public updateState(state: Subset<State>) {
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

    public postMessage(message: VscMessage<ModelerData>) {
        this.vscode.postMessage(message);
    }
}

type Subset<K> = {
    [attr in keyof K]?: K[attr] extends object ? Subset<K[attr]> : K[attr];
};
