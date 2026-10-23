import type { SaveXMLOptions, SaveXMLResult } from "bpmn-js/lib/BaseViewer";

interface DiagramXmlExporter {
    saveXML(options: SaveXMLOptions): Promise<SaveXMLResult>;
}

export async function exportFormattedXml(exporter: DiagramXmlExporter): Promise<string> {
    const { xml } = await exporter.saveXML({ format: true });
    // bpmn-js rejects on failure, so a resolved export always carries the XML.
    return xml!;
}
