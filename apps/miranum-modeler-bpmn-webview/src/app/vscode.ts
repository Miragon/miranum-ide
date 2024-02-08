import {
    BpmnFileQuery,
    Command,
    ElementTemplatesQuery,
    FormKeysQuery,
    LogErrorCommand,
    LogInfoCommand,
    Query,
    SyncDocumentCommand,
    VsCodeApi,
    VsCodeImpl,
    VsCodeMock,
} from "@miranum-ide/vscode/miranum-vscode-webview";

declare const process: { env: { NODE_ENV: string } };

type StateType = {
    selectedElement: string;
};

type MessageType = Command | Query;

export function getVsCodeApi(): VsCodeApi<StateType, MessageType> {
    if (process.env.NODE_ENV === "development") {
        return new MockedVsCodeApi();
    } else {
        return new VsCodeImpl<StateType, MessageType>();
    }
}

export class MockedVsCodeApi extends VsCodeMock<StateType, MessageType> {
    override updateState(state: Partial<StateType>): void {
        const currentState = this.getState();
        let selectedElement: string;
        if (state.selectedElement) {
            selectedElement = state.selectedElement;
        } else {
            selectedElement = currentState.selectedElement;
        }

        this.state = {
            selectedElement,
        };

        console.debug("[Debug] updateState()", this.getState());
    }

    override postMessage(message: MessageType): void {
        switch (true) {
            case message.type === "GetBpmnFileCommand": {
                // TODO: Use an actual bpmn file content
                dispatchEvent(new BpmnFileQuery("", "c7"));
                break;
            }
            case message.type === "GetFormKeysCommand": {
                dispatchEvent(new FormKeysQuery(["formKey1", "formKey2"]));
                break;
            }
            case message.type === "GetElementTemplatesCommand": {
                // TODO: Use actual element templates
                dispatchEvent(
                    new ElementTemplatesQuery(["elementTemplate1", "elementTemplate2"]),
                );
                break;
            }
            case message.type === "SyncDocumentCommand": {
                console.debug(
                    "[Debug] postMessage() SyncDocumentCommand",
                    (message as SyncDocumentCommand).content,
                );
                break;
            }
            case message.type === "LogInfoCommand": {
                console.info((message as LogInfoCommand).message);
                break;
            }
            case message.type === "LogErrorCommand": {
                console.error((message as LogErrorCommand).message);
                break;
            }
            default: {
                throw new Error(
                    `Unknown message type: ${(message as MessageType).type}`,
                );
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
