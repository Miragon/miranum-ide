import {inject, injectable} from "tsyringe";
import {LoggerMessage, MessageType} from "@miranum-ide/vscode/miranum-vscode-webview";

import {FilterWorkspaceInPort, GetLatestWorkspaceInPort, PostMessageInPort} from "../application/ports/in";
import {WelcomeWebview} from "./model";
import {Webview} from "vscode";
import {ConsoleMessageType, MiranumConsoleDto} from "./api";

@injectable()
export class WorkspaceAdapter {

    constructor(
        @inject("FilterWorkspaceInPort") private readonly filterWorkspaceInPort: FilterWorkspaceInPort,
    ) {
        this.initWorkspaces();
    }

    initWorkspaces() {
        this.filterWorkspaceInPort.filterWorkspaces();
    }
}

@injectable()
export class WebviewAdapter {

    constructor(
        private readonly webview: WelcomeWebview,
        @inject("GetLatestWorkspaceInPort") private readonly getLatestWorkspaceInPort: GetLatestWorkspaceInPort,
        @inject("PostMessageInPort") private readonly postMessageInPort: PostMessageInPort,
    ) {
        this.onDidReceiveMessage(this.webview.webview)
    }

    private onDidReceiveMessage(webview: Webview) {
        webview.onDidReceiveMessage(async (message: MiranumConsoleDto | LoggerMessage) => {
            if (message instanceof LoggerMessage) {
                switch (message.type) {
                    case MessageType.INFO: {
                        console.log(message.log);
                        break;
                    }
                    case MessageType.ERROR: {
                        console.error(message.log);
                        break;
                    }
                }
            }

            if (message instanceof MiranumConsoleDto) {
                switch (message.type) {
                    case MessageType.INITIALIZE: {
                        const latestWorkspaces = this.getLatestWorkspaceInPort.getLatestWorkspace();
                        this.postMessageInPort.postMessage(MessageType.INITIALIZE, latestWorkspaces);
                        break;
                    }
                    case ConsoleMessageType.CREATE_PROJECT: {
                        break;
                    }
                    case ConsoleMessageType.OPEN_PROJECT: {
                        break;
                    }
                }
            }
        });
    }
}
