import type { ModuleDeclaration } from "didi";

export interface EngineStack {
    /** Upstream engine plugins plus the shared modules, in the order camunda-bpmn-js registered them. */
    readonly upstreamModules: readonly ModuleDeclaration[];
    /** DI modules only this engine registers, placed right after the common modules. */
    readonly engineModules: readonly ModuleDeclaration[];
    readonly moddleExtensions: Readonly<Record<string, unknown>>;
    readonly propertiesPanelDefaults: Readonly<Record<string, unknown>>;
    readonly popupMenuDefaults?: Readonly<Record<string, unknown>>;
}
