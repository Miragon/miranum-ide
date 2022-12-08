import {useCallback} from "react";
import {DigiwfLib} from "@miragon-process-ide/digiwf-lib";

export const useInputChangeMessage = (vs: any) => {
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

export const useArtifactMessage = (vs: any, digiwfLib: DigiwfLib, name: string, type: string, path: string) => {
    return useCallback(() => {
        if (name !== '' && path !== '') {
            digiwfLib.generateArtifact(name, type, digiwfLib.projectConfig?.name ?? "")
                .then((artifact: any) => {
                    vs.postMessage({
                        message: 'generateArtifact',
                        data: {
                            artifact: artifact,
                            path: path
                        }
                    });
                })
                // todo proper error handling
                .catch((err: any) => console.error(err));
        }
    }, [name, type, path, vs, digiwfLib]);
}

export const useProjectMessage = (vs: any, digiwfLib: any, name: string, path: string) => {
    return useCallback(() => {
        if(name !== "" && path !== "") {
            digiwfLib.initProject(name)
                .then((artifacts: any) => {
                    vs.postMessage({
                        message: 'generateProject',
                        data: {
                            name: name,
                            path: path,
                            artifacts: artifacts
                        }
                    });
                })
                // todo proper error handling
                .catch((err: any) => console.error(err));
        }
    }, [name, path, vs, digiwfLib]);
}
