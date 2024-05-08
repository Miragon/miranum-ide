import { commands } from "vscode";
import { inject, singleton } from "tsyringe";

import { getContext } from "@miranum-ide/vscode/miranum-vscode";

import {
    OpenLoggingConsoleInPort,
    SplitFileInPort,
    ToggleTextEditorInPort,
} from "../../application/ports/in";
import { VsCodeFormPreviewAdapter } from "./editor";

@singleton()
export class VsCodeSplitFormFileCommand {
    private readonly command: string;

    constructor(
        @inject("SplitFormFileCommand") command: string,
        @inject("SplitFileInPort")
        private readonly splitFileInPort: SplitFileInPort,
    ) {
        this.command = command;

        const context = getContext();

        context.subscriptions.push(
            commands.registerCommand(this.command, this.split, this),
        );
    }

    split() {
        this.splitFileInPort.split();
    }
}

@singleton()
export class VsCodeToggleFormPreviewCommand {
    private readonly command: string;

    constructor(
        @inject("ToggleFormPreviewCommand") command: string,
        private readonly formPreviewAdapter: VsCodeFormPreviewAdapter,
    ) {
        this.command = command;

        const context = getContext();

        context.subscriptions.push(
            commands.registerCommand(this.command, this.toggle, this),
        );
    }

    async toggle() {
        await this.formPreviewAdapter.toggle();
    }
}

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

    async toggle() {
        await this.toggleTextEditorInPort.toggle();
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
