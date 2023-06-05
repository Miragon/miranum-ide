// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { FileData, MessageType } from "@miranum-ide/vscode/shared/miranum-console";

declare const globalViewType: string;
const vs = acquireVsCodeApi();

export const useVsMessage = (message: MessageType) => {
    return (data?: FileData) => {
        vs.postMessage({
            type: `${globalViewType}.${message}`,
            data: {
                fileData: data,
            },
        });
    };
};
