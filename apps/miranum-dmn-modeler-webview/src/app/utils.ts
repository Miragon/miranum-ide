import { ModelerData } from "../types/types";

export function instanceOfModelerData(object: any): object is ModelerData {
    return ("dmn" in object);
}
