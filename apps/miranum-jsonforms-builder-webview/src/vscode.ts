import {
    Command,
    LogErrorCommand,
    LogInfoCommand,
    Query,
    Renderer,
    SchemaQuery,
    SettingQuery,
    SyncDocumentCommand,
    UiSchemaQuery,
    type VsCodeApi,
    VsCodeImpl,
    VsCodeMock,
} from "@miranum-ide/vscode/miranum-vscode-webview";

declare const process: { env: { NODE_ENV: string } };

type StateType = unknown;

type MessageType = Command | Query;

export function getVsCodeApi(): VsCodeApi<StateType, MessageType> {
    if (process.env.NODE_ENV === "development") {
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
            case message.type === "GetSchemaCommand": {
                dispatchEvent(new SchemaQuery(minimalSchema));
                break;
            }
            case message.type === "GetUiSchemaCommand": {
                dispatchEvent(new UiSchemaQuery(minimalUiSchema));
                break;
            }
            case message.type === "GetSettingCommand": {
                dispatchEvent(new SettingQuery(Renderer.VUETIFY));
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
