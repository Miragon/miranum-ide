import { commands, env, Uri, workspace } from "vscode";
import { inject, singleton } from "tsyringe";

import { getContext } from "@miranum-ide/vscode/miranum-vscode";
import {
    GetDiagramAsSvgInPort,
    GetDocumentInPort,
    OpenLoggingConsoleInPort,
    ToggleTextEditorInPort,
} from "../../application/ports/in";
import { subscribeToMessageEvent } from "../out";
import { GetDiagramAsSVGCommand } from "@miranum-ide/vscode/miranum-vscode-webview";

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

@singleton()
export class VsCodeDiagramAsSvgCommand {
    constructor(
        @inject("CopyDiagramAsSvgCommand") writeToClipboard: string,
        @inject("SaveDiagramAsSvgCommand") writeToFile: string,
        @inject("GetDiagramAsSvgInPort")
        private readonly getDiagramAsSvgInPort: GetDiagramAsSvgInPort,
        @inject("GetDocumentInPort")
        private readonly getDocumentInPort: GetDocumentInPort,
    ) {
        const context = getContext();

        context.subscriptions.push(
            commands.registerCommand(writeToClipboard, this.writeToClipboard, this),
            commands.registerCommand(writeToFile, this.writeToFile, this),
        );
    }

    writeToClipboard(): void {
        this.getDiagramAsSvgInPort.getSvg();

        subscribeToMessageEvent((message) => {
            if (message.type === "GetDiagramAsSVGCommand") {
                const command = message as GetDiagramAsSVGCommand;
                if (command.svg && command.svg.length > 0) {
                    env.clipboard.writeText(command.svg);
                }
            }
        });
    }

    writeToFile(): void {
        this.getDiagramAsSvgInPort.getSvg();

        subscribeToMessageEvent((message) => {
            if (message.type === "GetDiagramAsSVGCommand") {
                const command = message as GetDiagramAsSVGCommand;
                if (command.svg && command.svg.length > 0) {
                    const filePath = this.getDocumentInPort
                        .getPath()
                        .replace("bpmn", "svg");

                    workspace.fs.writeFile(Uri.file(filePath), Buffer.from(command.svg));
                }
            }
        });
    }
}
