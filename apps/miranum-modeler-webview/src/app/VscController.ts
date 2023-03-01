import { VscMessage, VsCode, VscState } from "../types/VsCode";
import { ContentController } from "./ContentController";

export class VscController {
    public constructor(
        private readonly vscode: VsCode,
    ) { }

    public updateState(state: VscState): void {
        this.vscode.setState(state);
    }

    public getState(): VscState {
        return this.vscode.getState();
    }

    public postMessage(message: VscMessage): void {
        this.vscode.postMessage(message);
    }

    public setListener(modeler: ContentController): void {
        window.addEventListener("message", (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case "bpmn-modeler.undo":
                case "bpmn-modeler.redo":
                case "bpmn-modeler.updateFromExtension": {
                    modeler.importDiagram(message.text);
                    return;
                }
                case "FileSystemWatcher.reloadFiles": {
                    modeler.updateFiles(message.text);
                }
            }
        });
    }
}
