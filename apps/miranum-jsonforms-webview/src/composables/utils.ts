import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-jsonforms";

// export let confirm: any = null;
// export function confirmed() {
//     return new Promise((resolve) => {
//         confirm = (response: boolean) => {
//             resolve(response);
//         };
//     });
// }

/**
 * Create a way to resolve a Promise manually.
 * @returns - {
 *     wait - Returns the Promise to await
 *     done - Resolves the Promise returned by wait
 * }
 */
export function createResolver() {
    let resolver: (r: FormBuilderData | boolean | undefined) => void;
    const promise = new Promise<FormBuilderData | boolean | undefined>((resolve) => {
        resolver = (response: FormBuilderData | boolean | undefined) => {
            resolve(response);
        };
    });

    function wait() {
        return promise;
    }

    function done(data: FormBuilderData | boolean | undefined) {
        resolver(data);
    }

    return { wait, done };
}

export function instanceOfFormBuilderData(object: any): object is FormBuilderData {
    return "schema" in object || "uischema" in object;
}
