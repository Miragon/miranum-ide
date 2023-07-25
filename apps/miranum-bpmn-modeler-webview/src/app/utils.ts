import { ModelerData } from "@miranum-ide/vscode/shared/miranum-modeler";

export function instanceOfModelerData(object: any): object is ModelerData {
    return "bpmn" in object || "additionalFiles" in object;
}
