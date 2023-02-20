import { VsCode, VscState } from "../types/VsCode";

export class VsCodeController {
    public constructor(
        private readonly vscode: VsCode,
    ) { }

    public setState(): void {

    }

    public getState(): VscState {
        return this.vscode.getState();
    }

    public postMessage(): void {

    }
}
