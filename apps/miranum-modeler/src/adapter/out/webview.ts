import {
    BpmnFileQuery,
    DmnFileQuery,
    ElementTemplatesQuery,
    FormKeysQuery,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import {
    SendToBpmnModelerOutPort,
    SendToDmnModelerOutPort,
} from "../../application/ports/out";
import { postMessage } from "../webview";

export class BpmnWebviewAdapter implements SendToBpmnModelerOutPort {
    async sendBpmnFile(
        executionPlatform: "c7" | "c8",
        bpmnFile: string,
    ): Promise<boolean> {
        const bpmnFileQuery = new BpmnFileQuery(bpmnFile, executionPlatform);
        return postMessage(bpmnFileQuery);
    }

    async sendElementTemplates(elementTemplates: string[]): Promise<boolean> {
        const elementTemplatesQuery = new ElementTemplatesQuery(elementTemplates);
        return postMessage(elementTemplatesQuery);
    }

    async sendFormKeys(formKeys: string[]): Promise<boolean> {
        const formKeysQuery = new FormKeysQuery(formKeys);
        return postMessage(formKeysQuery);
    }
}

export class DmnWebviewAdapter implements SendToDmnModelerOutPort {
    async sendDmnFile(dmnFile: string): Promise<boolean> {
        const dmnFileQuery = new DmnFileQuery(dmnFile);
        return postMessage(dmnFileQuery);
    }
}
