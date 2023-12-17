import {inject, injectable} from "tsyringe";

import {FilterWorkspaceInPort, InitiateWebviewInPort} from "../application/ports/in";

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
        @inject("InitiateWebviewInPort") private readonly initMessageInPort: InitiateWebviewInPort,
    ) {}

    async initiateWebview() {
        await this.initMessageInPort.initiateWebview();
    }
}
