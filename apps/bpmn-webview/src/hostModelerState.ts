import type { BpmnModelerSetting, OpenScriptEditorRef } from "@miragon/bpmn-modeler-types";

interface SettingsTarget {
    setSettings(settings: BpmnModelerSetting): void;
}

interface OpenScriptEditorsTarget {
    applyOpenScriptEditors(refs: OpenScriptEditorRef[]): void;
}

/**
 * The host sends settings and open script editors only on load and on change,
 * so a modeler a mode switch builds later has to be handed the last known values.
 */
export class HostModelerState {
    private latestSettings: BpmnModelerSetting | undefined;
    private latestOpenScripts: OpenScriptEditorRef[] | undefined;

    get settings(): BpmnModelerSetting | undefined {
        return this.latestSettings;
    }

    rememberSettings(settings: BpmnModelerSetting): void {
        this.latestSettings = settings;
    }

    rememberOpenScripts(openScripts: OpenScriptEditorRef[]): void {
        this.latestOpenScripts = openScripts;
    }

    applySettingsPushedSince(
        builtWith: BpmnModelerSetting | undefined,
        modeler: SettingsTarget,
    ): void {
        if (this.latestSettings && this.latestSettings !== builtWith) {
            modeler.setSettings(this.latestSettings);
        }
    }

    restoreOpenScripts(modeler: OpenScriptEditorsTarget): void {
        if (this.latestOpenScripts) {
            modeler.applyOpenScriptEditors(this.latestOpenScripts);
        }
    }
}
