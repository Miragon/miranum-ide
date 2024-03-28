import { commands } from "vscode";
import { inject, singleton } from "tsyringe";

import { getContext } from "@miranum-ide/vscode/miranum-vscode";
import {
    OpenLoggingConsoleInPort,
    ToggleTextEditorInPort,
} from "../../application/ports/in";

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
export class VsCodeOpenLoggingConsoleCommand {
    private readonly command: string;

    constructor(
        @inject("OpenLoggingConsoleCommand") command: string,
        @inject("OpenLoggingConsoleInPort")
        private readonly openLoggingConsoleInPort: OpenLoggingConsoleInPort,
    ) {
        this.command = command;

        const context = getContext();

        context.subscriptions.push(
            commands.registerCommand(this.command, this.show, this),
        );
    }

    show(): void {
        this.openLoggingConsoleInPort.open();
    }
}
