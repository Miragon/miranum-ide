import {
    Command,
    DmnFileQuery,
    Query,
    VsCodeApi,
    VsCodeImpl,
    VsCodeMock,
} from "@miranum-ide/vscode/miranum-vscode-webview";

declare const process: { env: { NODE_ENV: string } };

type StateType = {
    dmnFile: string;
};

type MessageType = Command | Query;

export function getVsCodeApi(): VsCodeApi<StateType, MessageType> {
    if (process.env.NODE_ENV === "development") {
        return new MockedVsCodeApi();
    } else {
        return new VsCodeImpl<StateType, MessageType>();
    }
}

class MockedVsCodeApi extends VsCodeMock<StateType, MessageType> {
    override updateState(state: Partial<StateType>): void {
        const currentState = this.getState();

        this.state = {
            dmnFile: state.dmnFile ?? currentState.dmnFile,
        };

        console.debug("[Debug] updateState()", this.getState());
    }

    override postMessage(message: MessageType): void {
        switch (true) {
            case message.type === "GetDmnFileCommand": {
                dispatchEvent(new DmnFileQuery(""));
                break;
            }
            default: {
                throw new Error(`Unknown message type ${(message as MessageType).type}`);
            }
        }

        function dispatchEvent(event: MessageType) {
            window.dispatchEvent(
                new MessageEvent("message", {
                    data: event,
                }),
            );
        }
    }
}
