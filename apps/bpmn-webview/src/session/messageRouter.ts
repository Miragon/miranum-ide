import {
    type BpmnFileQuery,
    type BpmnLintDisabledQuery,
    type BpmnlintInPageQuery,
    type BpmnlintResultsQuery,
    type BpmnModelerSettingQuery,
    type CleanupDiagramQuery,
    type ClipboardQuery,
    type Command,
    type ElementTemplatesQuery,
    type FlushDocumentQuery,
    type FocusElementQuery,
    type FormatDiagramQuery,
    type FormReferenceStatusQuery,
    type GetDiagramAsSVGCommand,
    type ImplementationStatusQuery,
    type LanguageQuery,
    LogErrorCommand,
    type OpenAllScriptTasksQuery,
    type PropertiesPanelStateQuery,
    type Query,
    type ReleaseDocumentFlushQuery,
    type TakeFocusQuery,
    type TextClipboardQuery,
    type UpdateOpenScriptEditorsQuery,
    type UpdateScriptContentQuery,
    type UpdateScriptFormatQuery,
    type WorkspaceDefinitionsQuery,
} from "@miragon/bpmn-modeler-shared";

import { MessageGate } from "../messageGate";
import { type HostChannel, receiveErrorPrefix } from "./hostChannel";

export type HostMessage = Query | Command;

/** The host messages an editing session acts on, keyed by their `type`. */
export interface SessionHostMessages {
    BpmnFileQuery: BpmnFileQuery;
    ElementTemplatesQuery: ElementTemplatesQuery;
    BpmnlintResultsQuery: BpmnlintResultsQuery;
    BpmnLintDisabledQuery: BpmnLintDisabledQuery;
    BpmnlintInPageQuery: BpmnlintInPageQuery;
    BpmnModelerSettingQuery: BpmnModelerSettingQuery;
    PropertiesPanelStateQuery: PropertiesPanelStateQuery;
    ClipboardQuery: ClipboardQuery;
    TextClipboardQuery: TextClipboardQuery;
    LanguageQuery: LanguageQuery;
    GetDiagramAsSVGCommand: GetDiagramAsSVGCommand;
    OpenAllScriptTasksQuery: OpenAllScriptTasksQuery;
    FormatDiagramQuery: FormatDiagramQuery;
    CleanupDiagramQuery: CleanupDiagramQuery;
    UpdateScriptContentQuery: UpdateScriptContentQuery;
    UpdateScriptFormatQuery: UpdateScriptFormatQuery;
    UpdateOpenScriptEditorsQuery: UpdateOpenScriptEditorsQuery;
    ImplementationStatusQuery: ImplementationStatusQuery;
    FormReferenceStatusQuery: FormReferenceStatusQuery;
    WorkspaceDefinitionsQuery: WorkspaceDefinitionsQuery;
    FocusElementQuery: FocusElementQuery;
    TakeFocusQuery: TakeFocusQuery;
    FlushDocumentQuery: FlushDocumentQuery;
    ReleaseDocumentFlushQuery: ReleaseDocumentFlushQuery;
}

export type HostMessageHandlers<Messages> = {
    readonly [Type in keyof Messages]: (message: Messages[Type]) => void | Promise<void>;
};

export type HostMessageRoute = (message: HostMessage) => Promise<void>;

type AnyHostMessageHandler = (message: HostMessage) => void | Promise<void>;

// The page only waits for its reload; the host's save/close flush still needs an answer.
const ANSWERED_DURING_ENGINE_RELOAD: ReadonlySet<string> = new Set([
    "FlushDocumentQuery",
    "ReleaseDocumentFlushQuery",
] satisfies (keyof SessionHostMessages)[]);

/**
 * Host replies that act on the imported diagram. The webview requests their
 * sources before the import so the host round trip overlaps it, which means
 * they can arrive before the surface exists; they are held until the initial
 * import has completed.
 */
const IMPORT_BOUND_MESSAGE_TYPES: ReadonlySet<string> = new Set([
    "ElementTemplatesQuery",
    "BpmnModelerSettingQuery",
    "BpmnlintResultsQuery",
    "BpmnLintDisabledQuery",
    "BpmnlintInPageQuery",
    "LanguageQuery",
    "UpdateScriptContentQuery",
    "UpdateScriptFormatQuery",
    "UpdateOpenScriptEditorsQuery",
    "ImplementationStatusQuery",
] satisfies (keyof SessionHostMessages)[]);

export type SessionMessageAdmission = "drop" | "importBound" | "route";

export function admitSessionMessage(
    type: string,
    { engineReloading }: { engineReloading: boolean },
): SessionMessageAdmission {
    if (engineReloading && !ANSWERED_DURING_ENGINE_RELOAD.has(type)) {
        return "drop";
    }
    return IMPORT_BOUND_MESSAGE_TYPES.has(type) ? "importBound" : "route";
}

/** A type without a handler is ignored; a failing handler is reported to the host instead of rejecting. */
export function createHostMessageRouter<Messages>(
    host: HostChannel,
    handlers: HostMessageHandlers<Messages>,
): HostMessageRoute {
    // A Map, not the table itself, so a `type` naming an Object.prototype member finds no handler.
    const handlerByType = new Map(Object.entries(handlers) as [string, AnyHostMessageHandler][]);
    return async (message) => {
        const handle = handlerByType.get(message.type);
        if (!handle) {
            return;
        }
        try {
            await handle(message);
        } catch (error) {
            host.postMessage(
                new LogErrorCommand(receiveErrorPrefix(message.type) + failureMessage(error)),
            );
        }
    };
}

function failureMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "message" in error) {
        return String(error.message);
    }
    return String(error);
}

export interface SessionMessageRouter {
    readonly route: HostMessageRoute;
    /** Replays the held import-bound messages in arrival order and lets later ones straight through. */
    openImportBound(): void;
    discardImportBound(): void;
}

export function createSessionMessageRouter(
    host: HostChannel,
    handlers: HostMessageHandlers<SessionHostMessages>,
    lifecycle: { isReloading(): boolean },
): SessionMessageRouter {
    const dispatch = createHostMessageRouter(host, handlers);
    const importBoundMessages = new MessageGate<HostMessage>((message) => {
        void route(message);
    });

    async function route(message: HostMessage): Promise<void> {
        const admission = admitSessionMessage(message.type, {
            engineReloading: lifecycle.isReloading(),
        });
        if (admission === "drop") {
            return;
        }
        if (admission === "importBound" && importBoundMessages.hold(message)) {
            return;
        }
        await dispatch(message);
    }

    return {
        route,
        openImportBound: () => importBoundMessages.open(),
        discardImportBound: () => importBoundMessages.discard(),
    };
}
