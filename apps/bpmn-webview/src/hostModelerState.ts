import type { BpmnModelerSetting, OpenScriptEditorRef } from "@miragon/bpmn-modeler-types";

interface OpenScriptEditorsTarget {
    applyOpenScriptEditors(refs: OpenScriptEditorRef[]): void;
}

/**
 * The latest modeler settings and open script editors the host pushed. The
 * host sends both only on load and on change, so a modeler a mode switch
 * builds later has to be handed the last known values instead of the defaults.
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

    /** A no-op until the host has reported open script editors. */
    restoreOpenScripts(modeler: OpenScriptEditorsTarget): void {
        if (this.latestOpenScripts) {
            modeler.applyOpenScriptEditors(this.latestOpenScripts);
        }
    }
}
