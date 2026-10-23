import { describe, expect, it, vi } from "vitest";

import { HostModelerState } from "./hostModelerState";

const settings = (alignToOrigin: boolean) => ({
    alignToOrigin,
    showTransactionBoundaries: false,
    colorTheme: "light" as const,
});

const openScript = (elementId: string) => ({
    elementId,
    kind: "script-task" as const,
    listenerIndex: undefined,
    fileName: `${elementId}.js`,
});

describe("HostModelerState", () => {
    it("has no settings before the host sent any", () => {
        expect(new HostModelerState().settings).toBeUndefined();
    });

    it("keeps the settings the host sent last", () => {
        const state = new HostModelerState();

        state.rememberSettings(settings(false));
        state.rememberSettings(settings(true));

        expect(state.settings).toEqual(settings(true));
    });

    it("leaves a modeler's open-script locks alone before the host reported any", () => {
        const modeler = { applyOpenScriptEditors: vi.fn() };

        new HostModelerState().restoreOpenScripts(modeler);

        expect(modeler.applyOpenScriptEditors).not.toHaveBeenCalled();
    });

    it("restores the open script editors the host reported last, even when none are open", () => {
        const state = new HostModelerState();
        const modeler = { applyOpenScriptEditors: vi.fn() };

        state.rememberOpenScripts([openScript("Task_1")]);
        state.restoreOpenScripts(modeler);
        state.rememberOpenScripts([]);
        state.restoreOpenScripts(modeler);

        expect(modeler.applyOpenScriptEditors.mock.calls).toEqual([[[openScript("Task_1")]], [[]]]);
    });
});
