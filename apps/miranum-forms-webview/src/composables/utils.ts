import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-forms";

export let initialize: any = null;
export function initialized() {
    return new Promise((resolve) => {
        initialize = (response: FormBuilderData | undefined) => {
            resolve(response);
        };
    });
}

export function instanceOfFormBuilderData(object: any): object is FormBuilderData {
    return "schema" in object || "key" in object;
}
