import { singleton } from "tsyringe";

import {
    BpmnFileQuery,
    DmnFileQuery,
    ElementTemplatesQuery,
    FormKeysQuery,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import { postMessage } from "../helper/vscode";
import {
    SendToBpmnModelerOutPort,
    SendToDmnModelerOutPort,
} from "../../application/ports/out";

@singleton()
export class BpmnWebviewAdapter implements SendToBpmnModelerOutPort {
    async sendBpmnFile(
        webviewId: string,
        executionPlatform: "c7" | "c8",
        bpmnFile: string,
    ): Promise<boolean> {
        const bpmnFileQuery = new BpmnFileQuery(bpmnFile, executionPlatform);
        return postMessage(webviewId, bpmnFileQuery);
    }

    async sendElementTemplates(
        webviewId: string,
        elementTemplates: string[],
    ): Promise<boolean> {
        const elementTemplatesQuery = new ElementTemplatesQuery(elementTemplates);
        return postMessage(webviewId, elementTemplatesQuery);
    }

    async sendFormKeys(webviewId: string, formKeys: string[]): Promise<boolean> {
        const formKeysQuery = new FormKeysQuery(formKeys);
        return postMessage(webviewId, formKeysQuery);
    }
}

@singleton()
export class DmnWebviewAdapter implements SendToDmnModelerOutPort {
    async sendDmnFile(webviewId: string, dmnFile: string): Promise<boolean> {
        const dmnFileQuery = new DmnFileQuery(dmnFile);
        return postMessage(webviewId, dmnFileQuery);
    }
}
