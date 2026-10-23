import {
    type Command,
    type DmnFileQuery,
    type DmnModelerSettingQuery,
    type FlushDocumentQuery,
    type HostThemeAdapter,
    type LanguageQuery,
    type PropertiesPanelStateQuery,
    type Query,
    type ReleaseDocumentFlushQuery,
    takeFocus,
} from "@miragon/bpmn-modeler-shared";

import type { DmnDocumentSession } from "./documentSession";

type DmnMessageSession = Pick<
    DmnDocumentSession,
    "receiveHostFile" | "respondToFlush" | "applyLanguage" | "focusCanvas"
>;

/** Where one session's settings and panel-state replies from the host land. */
export interface DmnHostReplies {
    panelState: { done(query: PropertiesPanelStateQuery): void };
    settings: { done(query: DmnModelerSettingQuery): void };
    theme: Pick<HostThemeAdapter, "setMode">;
}

export async function routeDmnHostMessage(
    message: Query | Command,
    session: DmnMessageSession,
    replies: DmnHostReplies,
): Promise<void> {
    switch (message.type) {
        case "DmnFileQuery":
            await session.receiveHostFile(message as DmnFileQuery);
            break;
        case "PropertiesPanelStateQuery":
            replies.panelState.done(message as PropertiesPanelStateQuery);
            break;
        case "DmnModelerSettingQuery": {
            // Applied live so a VS Code theme change in `"automatic"` mode
            // re-themes an already-open editor, not just on first load.
            const settingQuery = message as DmnModelerSettingQuery;
            replies.theme.setMode(settingQuery.setting.colorTheme);
            replies.settings.done(settingQuery);
            break;
        }
        case "LanguageQuery":
            await session.applyLanguage((message as LanguageQuery).locale);
            break;
        case "TakeFocusQuery":
            takeFocus(() => session.focusCanvas());
            break;
        case "FlushDocumentQuery":
        case "ReleaseDocumentFlushQuery":
            await session.respondToFlush(message as FlushDocumentQuery | ReleaseDocumentFlushQuery);
            break;
    }
}
