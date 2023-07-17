import Modeler from "camunda-bpmn-js/lib/base/Modeler";
import { ImportXMLError, ImportXMLResult, SaveXMLResult } from "bpmn-js/lib/BaseViewer";

export class ContentController {
    constructor(private readonly modeler: Modeler) {}

    public async newDiagram(): Promise<ImportXMLResult> {
        return this.modeler.createDiagram();
    }

    public async loadDiagram(bpmn: string): Promise<ImportXMLResult> {
        try {
            return await this.modeler.importXML(bpmn);
        } catch (error: unknown) {
            const importError: ImportXMLError = error as ImportXMLError;
            const { message, warnings } = importError;
            throw Error(`${message} ${warnings}`);
        }
    }

    public async exportDiagram(): Promise<string> {
        const result: SaveXMLResult = await this.modeler.saveXML({ format: true });
        if (result.xml) {
            return result.xml;
        } else if (result.error) {
            throw result.error;
        }

        throw Error("Failed to save changes made to the diagram!");
    }
}
