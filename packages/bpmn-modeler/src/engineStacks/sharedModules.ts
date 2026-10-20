import type { ModuleDeclaration } from "didi";
import MinimapModule from "diagram-js-minimap";
import ExecutableFixModule from "bpmn-js-executable-fix";
import NativeCopyPasteModule from "bpmn-js-native-copy-paste";
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from "bpmn-js-properties-panel";
import { CopyAsImageModule } from "bpmn-js-copy-as-image";
import AlignToOriginModule from "@bpmn-io/align-to-origin";
import GridModule from "diagram-js-grid";

export const sharedLeadingModules: readonly ModuleDeclaration[] = [
    MinimapModule,
    ExecutableFixModule,
    NativeCopyPasteModule,
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CopyAsImageModule,
];

// camunda-bpmn-js appended these after the engine modules; keep that order.
export const sharedTrailingModules: readonly ModuleDeclaration[] = [
    AlignToOriginModule,
    GridModule,
];
