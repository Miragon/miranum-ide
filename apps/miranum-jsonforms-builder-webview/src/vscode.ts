import {
    Command,
    JsonFormQuery,
    LogErrorCommand,
    LogInfoCommand,
    Query,
    SettingQuery,
    SyncDocumentCommand,
    type VsCodeApi,
    VsCodeImpl,
    VsCodeMock,
} from "@miranum-ide/vscode/miranum-vscode-webview";

type StateType = unknown;

type MessageType = Command | Query;

export function getVsCodeApi(): VsCodeApi<StateType, MessageType> {
    if (import.meta.env.MODE === "development") {
        return new MockedVsCodeApi();
    } else {
        return new VsCodeImpl<StateType, MessageType>();
    }
}

class MockedVsCodeApi extends VsCodeMock<StateType, MessageType> {
    override updateState(): void {
        throw new Error("Method not implemented.");
    }

    override postMessage(message: MessageType): void {
        switch (true) {
            case message.type === "GetJsonFormCommand": {
                dispatchEvent(new JsonFormQuery(minimalJsonForm));
                break;
            }
            case message.type === "GetSettingCommand": {
                dispatchEvent(new SettingQuery("vuetify"));
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

const minimalSchema = `{
    "type": "object",
    "properties": {}
}`;

const minimalUiSchema = `{
    "type": "VerticalLayout",
    "elements": []
}`;

const minimalJsonForm = `{
    "schema": ${minimalSchema},
    "uischema": ${minimalUiSchema}
}`;
