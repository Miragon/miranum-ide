import { commands } from "vscode";
import { inject, singleton } from "tsyringe";

import { getContext } from "@miranum-ide/vscode/miranum-vscode";
import { ToggleTextEditorInPort } from "../../application/ports/in";
import { ShowLoggerOutPort } from "../../application/ports/out";

@singleton()
export class VsCodeToggleTextEditorCommand {
    private readonly command: string;

    constructor(
        @inject("ToggleTextEditorCommand") command: string,
        @inject("ToggleTextEditorInPort")
        private readonly toggleTextEditorInPort: ToggleTextEditorInPort,
    ) {
        this.command = command;

        const context = getContext();

        context.subscriptions.push(
            commands.registerCommand(this.command, this.toggle, this),
        );
    }

    toggle() {
        this.toggleTextEditorInPort.toggle();
    }
}

@singleton()
export class VsCodeShowLoggerCommand {
    private readonly command: string;

    constructor(
        @inject("ShowLoggerCommand") command: string,
        @inject("ShowLoggerOutPort")
        private readonly showLoggerOutPort: ShowLoggerOutPort,
    ) {
        this.command = command;

        const context = getContext();

        context.subscriptions.push(
            commands.registerCommand(this.command, this.show, this),
        );
    }

    show(): void {
        this.showLoggerOutPort.show();
    }
}
