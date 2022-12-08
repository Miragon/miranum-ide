// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const vs = acquireVsCodeApi();


export const useArtifactMessage = (path: string) => {
    return (artifact: any) => {
        vs.postMessage({
            message: 'generateArtifact',
            data: {
                artifact: artifact,
                path: path
            }
        });
    }
}

export const useProjectMessage = (name: string, path: string) => {
    return (artifacts: any) => {
        vs.postMessage({
            message: 'generateProject',
            data: {
                name: name,
                path: path,
                artifacts: artifacts
            }
        });
    }
}

export const useInputChangeMessage = () => {
    return (name: string, type?: string) => {
        vs.postMessage({
            message: "changedInput",
            data: {
                name: name,
                type: type
            }
        });
    }
}

export const useFilePickerMessage = () => {
    return () => {
        vs.postMessage({
            message:'openFilePicker',
        })
    }
}
