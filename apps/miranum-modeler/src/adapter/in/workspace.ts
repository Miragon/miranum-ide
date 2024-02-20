import { workspace } from "vscode";
import { inject, singleton } from "tsyringe";

import { DisplayBpmnModelerInPort } from "../../application/ports/in";

@singleton()
export class FileSystemWatcherAdapter {
    constructor(
        @inject("SendToBpmnModelerInPort")
        private readonly sendToBpmnModelerInPort: DisplayBpmnModelerInPort,
    ) {
        this.createWatcher();
    }

    private createWatcher(): void {
        const watcher = workspace.createFileSystemWatcher("**/*.bpmn");
    }
}
