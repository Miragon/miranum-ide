import { createModeler } from "@miragon/bpmn-modeler";
import { createViewer } from "@miragon/bpmn-modeler/viewer";
import { createDesigner } from "@miragon/bpmn-modeler/design";
import * as lintModule from "@miragon/bpmn-modeler/lint";
import type { SurfaceFactories } from "@miragon/bpmn-modeler/mode";
import { DemoDefinitionSearch, openReference } from "../../src";
import { registerDemoCustomGroup } from "../../src/demoCustomGroup";

/**
 * The demo's per-mode surface factories, injected into the mode session. Every
 * surface shares the demo canvas + panel mount and registers the demo custom
 * group so the host slot is observable in all three modes. Model navigation is
 * wired everywhere; the editable surfaces add the definition search over the
 * other registry models. Both editable surfaces lint
 * in-page (the eager `/lint` module) — the designer with the engine-neutral
 * Design config, the modeler additionally toggling Design↔Implement live and
 * re-resolving its lint config per mode.
 */
export function buildDemoSurfaces(panelMount: HTMLElement, modelId: string): SurfaceFactories {
    const propertiesPanel = { parent: panelMount };
    const viewerCapabilities = { modelNavigation: { openReference } };
    const capabilities = {
        ...viewerCapabilities,
        definitionSearch: new DemoDefinitionSearch(modelId),
    };

    return {
        view: async ({ container, theme }) => {
            const handle = await createViewer(container, {
                theme,
                propertiesPanel,
                capabilities: viewerCapabilities,
            });
            registerDemoCustomGroup(handle);
            return handle;
        },
        design: async ({ container, theme }) => {
            const handle = await createDesigner(container, {
                theme,
                propertiesPanel,
                capabilities,
                linting: { module: lintModule },
                onLintResults: ({ results, unresolved }) => {
                    console.debug("[demo] in-page lint (design)", { results, unresolved });
                },
            });
            registerDemoCustomGroup(handle);
            return handle;
        },
        // A tagged model in Design or Implement: one createModeler instance whose
        // `mode` the session toggles live. No `clipboard` option means the native
        // browser clipboard.
        implement: async ({ container, theme, mode, engine }) => {
            if (engine === undefined) {
                // The session routes here only for tagged models.
                throw new Error("implement surface requires a tagged model");
            }
            const handle = await createModeler(container, {
                engine,
                mode,
                theme,
                propertiesPanel,
                capabilities,
                linting: { module: lintModule },
                onLintResults: ({ results, unresolved }) => {
                    console.debug("[demo] in-page lint", { results, unresolved });
                },
            });
            registerDemoCustomGroup(handle);
            return handle;
        },
    };
}
