import { VsCode } from "./types/VsCode";
import { MiranumModeler } from "./app/MiranumModeler";
import { VsCodeController } from "./app/VsCodeController";

declare const vscode: VsCode;

const vsCodeController = new VsCodeController(vscode);
const modeler = new MiranumModeler(vsCodeController);

// todo: set listener
window.addEventListener("message", (event: MessageEvent) => {
    const message = event.data;
    switch (message.type) {
        case "bpmn-modeler.undo":
        case "bpmn-modeler.redo":
        case "bpmn-modeler.updateFromExtension": {
            const xml = message.text;
            modeler.importDiagram(xml);
            return;
        }
        case "FileSystemWatcher.reloadFiles": {
            //setFilesContent(message.text);
            //var loader = modeler.get("elementTemplatesLoader");
            //loader.setTemplates(templates);
            modeler.updateElementTemplate(message.text);
        }
    }
});
