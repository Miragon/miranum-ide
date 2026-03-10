/**
 * Modeler-specific messages for the VS Code extension ↔ webview communication protocol.
 *
 * Extends the base {@link Query} and {@link Command} abstractions from {@link messages.ts}
 * with all concrete message types required by the BPMN and DMN modeler features:
 *
 * Queries (extension host → webview):
 * - {@link BpmnFileQuery}            — deliver BPMN XML and detected engine type for rendering
 * - {@link DmnFileQuery}             — deliver DMN XML for rendering
 * - {@link ElementTemplatesQuery}    — deliver the resolved element-template list
 * - {@link BpmnModelerSettingQuery}  — deliver modeler settings (e.g. alignToOrigin)
 * - {@link ClipboardQuery}           — deliver clipboard text (host mediates sandboxed reads)
 *
 * Commands (webview → extension host):
 * - {@link GetBpmnFileCommand}            — webview is ready; request the BPMN file
 * - {@link GetDmnFileCommand}             — webview is ready; request the DMN file
 * - {@link GetElementTemplatesCommand}    — request the current element-template list
 * - {@link GetBpmnModelerSettingCommand}  — request current modeler settings
 * - {@link GetClipboardCommand}           — request clipboard text from the host
 * - {@link SetClipboardCommand}           — ask the host to write text to the clipboard
 * - {@link GetDiagramAsSVGCommand}        — request an SVG export of the current diagram
 *
 * @see messages.ts for the base {@link Query} and {@link Command} classes.
 */
import { Command, Query } from "./messages";

// =================================== Queries ==================================>
export class BpmnFileQuery extends Query {
    public readonly content: string;

    public readonly engine: "c7" | "c8";

    constructor(content: string, engine: "c7" | "c8") {
        super("BpmnFileQuery");
        this.content = content;
        this.engine = engine;
    }
}

export class DmnFileQuery extends Query {
    public readonly content: string;

    constructor(content: string) {
        super("DmnFileQuery");
        this.content = content;
    }
}

export class ElementTemplatesQuery extends Query {
    public readonly elementTemplates: JSON[];

    constructor(elementTemplates: any[]) {
        super("ElementTemplatesQuery");
        this.elementTemplates = elementTemplates;
    }
}

export interface BpmnModelerSetting {
    readonly alignToOrigin: boolean;
    readonly showTransactionBoundaries: boolean;
}

export class BpmnModelerSettingQuery extends Query {
    public readonly setting: BpmnModelerSetting;

    constructor(setting: BpmnModelerSetting) {
        super("BpmnModelerSettingQuery");
        this.setting = setting;
    }
}

export class ClipboardQuery extends Query {
    public readonly text: string;

    constructor(text: string) {
        super("ClipboardQuery");
        this.text = text;
    }
}

// <================================== Queries ===================================
//
// =================================== Commands ==================================>
export class GetBpmnFileCommand extends Command {
    constructor() {
        super("GetBpmnFileCommand");
    }
}

export class GetDiagramAsSVGCommand extends Command {
    svg?: string;

    constructor() {
        super("GetDiagramAsSVGCommand");
    }
}

export class GetDmnFileCommand extends Command {
    constructor() {
        super("GetDmnFileCommand");
    }
}

export class GetElementTemplatesCommand extends Command {
    constructor() {
        super("GetElementTemplatesCommand");
    }
}

export class GetBpmnModelerSettingCommand extends Command {
    constructor() {
        super("GetBpmnModelerSettingCommand");
    }
}

export class GetClipboardCommand extends Command {
    constructor() {
        super("GetClipboardCommand");
    }
}

export class SetClipboardCommand extends Command {
    public readonly text: string;

    constructor(text: string) {
        super("SetClipboardCommand");
        this.text = text;
    }
}

// <================================== Commands ===================================

// =================================== Errors ==================================>
export class NoModelerError extends Error {
    constructor() {
        super("Modeler is not initialized!");
    }
}

// <================================== Errors ===================================

// =================================== Functions ==================================>
/**
 * Create a list of information that will be sent to the backend and get logged.
 * @param errors A list of further information.
 */
export function formatErrors(errors: string[]): string {
    let msg = "";
    if (errors && errors.length > 0) {
        for (const message of errors) {
            msg += `\n- ${message}`;
        }
    }
    return msg;
}

// <================================== Functions ===================================
