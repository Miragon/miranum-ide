import { VsCode } from "./types";
import {
    FormBuilderData,
    MessageType,
    VscMessage,
    VscState,
} from "@miranum-ide/vscode/shared/miranum-jsonforms";

declare const globalViewType: string;

/**
 * To simplify the development of the webview, we allow it to run in the browser.
 * For this purpose, the functionality of the extension/backend is mocked.
 */
export class MockedStateController implements VsCode {
    public getState(): VscState<FormBuilderData> | undefined {
        return undefined;
    }

    public async postMessage(message: VscMessage<FormBuilderData>): Promise<void> {
        const { type, data, logger } = message;
        switch (type) {
            case `${globalViewType}.${MessageType.initialize}`: {
                console.debug("[Log]", MessageType.initialize, data, logger);
                window.dispatchEvent(
                    new MessageEvent("message", {
                        data: {
                            type: `${globalViewType}.${MessageType.initialize}`,
                            data: initialData,
                        },
                    }),
                );
                break;
            }
            case `${globalViewType}.${MessageType.msgFromWebview}`: {
                console.debug("[Log]", MessageType.msgFromWebview, data, logger);
                break;
            }
            case `${globalViewType}.${MessageType.error}`: {
                console.error("[Log]", MessageType.error, logger);
                break;
            }
            case `${globalViewType}.${MessageType.info}`: {
                console.log("[Log]", MessageType.info, logger);
                break;
            }
        }
    }

    public setState(state: VscState<FormBuilderData>): void {
        console.debug("[Log] setState()", state);
    }

    public updateState(state: VscState<FormBuilderData>): void {
        console.debug("[Log] updateState()", state);
    }
}

const initialData: FormBuilderData = {
    schema: {
        type: "object",
        properties: {},
    },
    uischema: {
        type: "VerticalLayout",
        elements: [],
    },
};
