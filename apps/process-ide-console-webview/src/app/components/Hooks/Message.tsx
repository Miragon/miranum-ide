// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const vs = acquireVsCodeApi();

export const useVsMessage = (message: string) => {
    return (data?: object) => {
        vs.postMessage({
            message: message,
            data: data
        })
    }
}
