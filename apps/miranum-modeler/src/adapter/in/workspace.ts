import { workspace } from "vscode";
import { inject, singleton } from "tsyringe";

import { SendToBpmnModelerInPort } from "../../application/ports/in";

@singleton()
export class FileSystemWatcherAdapter {
    constructor(
        @inject("SendToBpmnModelerInPort")
        private readonly sendToBpmnModelerInPort: SendToBpmnModelerInPort,
    ) {
        this.createWatcher();
    }

    private createWatcher(): void {
        const watcher = workspace.createFileSystemWatcher("**/*.bpmn");
    }
}
