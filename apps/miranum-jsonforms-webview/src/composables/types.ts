import {
    FormBuilderData,
    VscMessage,
    VscState,
} from "@miranum-ide/vscode/shared/miranum-jsonforms";

export interface VsCode {
    getState(): VscState<FormBuilderData> | undefined;

    setState(state: VscState<FormBuilderData>): void;

    updateState(state: VscState<FormBuilderData>): void;

    postMessage(message: VscMessage<FormBuilderData>): void;
}
