import { ModelerData } from "@miranum-ide/vscode/shared/miranum-modeler";

export function instanceOfModelerData(object: any): object is ModelerData {
    return "bpmn" in object || "additionalFiles" in object;
}

/**
 * Create a way to resolve a Promise manually.
 * @returns - {
 *     wait - Returns the Promise to await
 *     done - Resolves the Promise returned by wait
 * }
 */
export function createResolver() {
    let resolver: (r: ModelerData | undefined) => void;
    const promise = new Promise<ModelerData | undefined>((resolve) => {
        resolver = (response: ModelerData | undefined) => {
            resolve(response);
        };
    });

    function wait() {
        return promise;
    }

    function done(data: ModelerData | undefined) {
        resolver(data);
    }

    return { wait, done };
}
