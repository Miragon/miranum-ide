import {
    BpmnFileQuery,
    BpmnModelerSettingQuery,
    Command,
    ElementTemplatesQuery,
    LogErrorCommand,
    LogInfoCommand,
    Query,
    SyncDocumentCommand,
    VsCodeApi,
    VsCodeImpl,
    VsCodeMock,
} from "@miranum-ide/miranum-vscode-webview";

import elementTemplate from "./__fixtures__/elementTemplate.json";

declare const process: { env: { NODE_ENV: string } };

type StateType = unknown;

type MessageType = Command | Query;

/**
 * Returns the appropriate VS Code API implementation.
 *
 * In `development` mode a {@link MockedVsCodeApi} is returned so the webview
 * can be run standalone in a browser without a VS Code host.  In all other
 * environments the real {@link VsCodeImpl} is used.
 */
export function getVsCodeApi(): VsCodeApi<StateType, MessageType> {
    console.log(process.env.NODE_ENV);
    if (process.env.NODE_ENV === "development") {
        return new MockedVsCodeApi();
    } else {
        return new VsCodeImpl<StateType, MessageType>();
    }
}

/**
 * Development-only mock that simulates the VS Code extension host by
 * dispatching synthetic `MessageEvent`s in response to outbound commands.
 */
class MockedVsCodeApi extends VsCodeMock<StateType, MessageType> {
    override updateState(): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Intercepts outbound messages and dispatches the corresponding inbound
     * response so the webview can operate without a real VS Code host.
     *
     * @param message The outbound command sent by the webview.
     */
    override postMessage(message: MessageType): void {
        switch (true) {
            case message.type === "GetBpmnFileCommand": {
                console.debug("[DEBUG] GetBpmnFileCommand", message);
                dispatchEvent(new BpmnFileQuery("", "c7"));
                break;
            }
            case message.type === "GetElementTemplatesCommand": {
                console.debug("[DEBUG] GetElementTemplatesCommand", message);
                dispatchEvent(new ElementTemplatesQuery([elementTemplate as unknown as JSON]));
                break;
            }
            case message.type === "GetBpmnModelerSettingCommand": {
                console.debug("[DEBUG] GetBpmnModelerSettingCommand", message);
                dispatchEvent(
                    new BpmnModelerSettingQuery({
                        alignToOrigin: true,
                        darkTheme: false,
                    }),
                );
                break;
            }
            case message.type === "SyncDocumentCommand": {
                console.debug(
                    "[DEBUG] SyncDocumentCommand",
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
