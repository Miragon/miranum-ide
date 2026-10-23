import BpmnModeler from "bpmn-js/lib/Modeler";
import { BpmnModdle } from "bpmn-moddle";
import CamundaPlatformModeler from "camunda-bpmn-js/lib/camunda-platform/Modeler";
import CamundaCloudModeler from "camunda-bpmn-js/lib/camunda-cloud/Modeler";
import CreateAppendGroupsModule from "camunda-bpmn-js/lib/base/features/create-append-groups";
import CreateAppendTabsModule from "camunda-bpmn-js/lib/base/features/create-append-tabs";
import {
    DefaultHandlersModule,
    ResourcesModule,
} from "camunda-bpmn-js/lib/camunda-cloud/features/external-resources";
import { afterEach, describe, expect, it } from "vitest";

import type { Engine } from "@miragon/bpmn-modeler-types";

import type { EngineStack } from "./engineStack";
import { loadEngineStack } from "./index";
import { mountCanvas, removeMounts } from "../__fixtures__/surfaceMount";

// Pins each engine stack against the installed camunda-bpmn-js Modeler it replaces, so a bump
// that adds, drops, reorders or reshapes a module or option default fails here; delete with
// the dependency.

type UpstreamModeler = CamundaPlatformModeler | CamundaCloudModeler;

interface UpstreamConfig {
    readonly moddleExtensions: Readonly<Record<string, unknown>>;
    readonly propertiesPanel: Readonly<Record<string, unknown>>;
    readonly popupMenu?: Readonly<Record<string, unknown>>;
}

interface EngineCase {
    readonly engine: Engine;
    readonly createUpstream: (container: HTMLElement) => UpstreamModeler;
    readonly engineUnwiredModules: readonly object[];
    readonly substitutes: ReadonlyMap<object, object>;
}

const DROPPED_TAB_PROVIDERS: readonly string[] = ["createTabsProvider", "appendTabsProvider"];

function withoutCreateAppendTabProviders(tabsModule: object): object {
    return Object.fromEntries(
        Object.entries(tabsModule)
            .filter(([key]) => !DROPPED_TAB_PROVIDERS.includes(key))
            .map(([key, value]) =>
                key === "__init__"
                    ? [
                          key,
                          (value as readonly string[]).filter(
                              (name) => !DROPPED_TAB_PROVIDERS.includes(name),
                          ),
                      ]
                    : [key, value],
            ),
    );
}

const CASES: readonly EngineCase[] = [
    {
        engine: "c7",
        createUpstream: (container) => new CamundaPlatformModeler({ container }),
        engineUnwiredModules: [],
        substitutes: new Map(),
    },
    {
        engine: "c8",
        createUpstream: (container) => new CamundaCloudModeler({ container }),
        engineUnwiredModules: [DefaultHandlersModule, ResourcesModule],
        substitutes: new Map([
            [CreateAppendTabsModule, withoutCreateAppendTabProviders(CreateAppendTabsModule)],
        ]),
    },
];

const FEEL_LINK_TYPES = ["feel", "feelers", "unrelated"] as const;

const BPMN_JS_MODULES: ReadonlySet<object> = new Set(
    (BpmnModeler.prototype as unknown as { readonly _modules: readonly object[] })._modules,
);

let upstream: UpstreamModeler | undefined;

afterEach(() => {
    upstream?.destroy();
    upstream = undefined;
    removeMounts();
});

function createUpstream(engineCase: EngineCase): UpstreamModeler {
    upstream = engineCase.createUpstream(mountCanvas());
    return upstream;
}

function upstreamConfig(modeler: UpstreamModeler): UpstreamConfig {
    return modeler.get<UpstreamConfig>("config");
}

function bpmnJsConfigKeys(): ReadonlySet<string> {
    const baseline = new BpmnModeler({ container: document.createElement("div") });
    const keys = new Set(Object.keys(baseline.get<object>("config")));
    baseline.destroy();
    return keys;
}

function suppliedOptionGroups(stack: EngineStack): string[] {
    const groups = ["moddleExtensions", "propertiesPanel"];
    if (stack.popupMenuDefaults) groups.push("popupMenu");
    return groups.sort();
}

function dunderEntries(module: object, key: "__init__" | "__depends__"): readonly unknown[] {
    const entries = (module as Readonly<Record<string, unknown>>)[key];
    return Array.isArray(entries) ? entries : [];
}

function moduleLabel(module: object): string {
    const services = Object.keys(module).filter((key) => !key.startsWith("__"));
    if (services.length > 0) return services.sort().join(",");
    const dependencyLabels = dunderEntries(module, "__depends__").map((dependency) =>
        moduleLabel(dependency as object),
    );
    if (dependencyLabels.length > 0) return `depends(${dependencyLabels.join(" | ")})`;
    const initializers = dunderEntries(module, "__init__").map((initializer) =>
        typeof initializer === "function" ? initializer.name : String(initializer),
    );
    return `init(${initializers.join(",")})`;
}

function feelPopupLinks(propertiesPanel: Readonly<Record<string, unknown>>): unknown[] {
    const getFeelPopupLinks = propertiesPanel.getFeelPopupLinks as
        ((type: string) => unknown) | undefined;
    return FEEL_LINK_TYPES.map((type) => getFeelPopupLinks?.(type));
}

// moddle rewrites registered descriptors in place, as upstream's constructor did to its own copy.
function asRegistered(
    moddleExtensions: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
    const descriptors = structuredClone(moddleExtensions);
    BpmnModdle(descriptors);
    return descriptors;
}

function expectedUpstreamModules(engineCase: EngineCase, modeler: UpstreamModeler): object[] {
    const pluginModules: object[] = modeler
        .getModules()
        .filter((module: object) => !BPMN_JS_MODULES.has(module));

    const chooserModule = pluginModules.find((module) => "elementTemplateChooser" in module);
    expect(chooserModule, "upstream no longer adds an elementTemplateChooser module").toBeDefined();

    const unwiredModules = [
        chooserModule!,
        CreateAppendGroupsModule,
        ...engineCase.engineUnwiredModules,
    ];
    const replacedModules = [...engineCase.substitutes.keys()];
    expect(
        [...unwiredModules, ...replacedModules]
            .filter((module) => !pluginModules.includes(module))
            .map(moduleLabel),
        "upstream no longer registers these documented exclusions/substitutions",
    ).toEqual([]);

    return pluginModules
        .filter((module) => !unwiredModules.includes(module))
        .map((module) => engineCase.substitutes.get(module) ?? module);
}

describe("engine stacks pinned against the installed camunda-bpmn-js Modelers", () => {
    it.each(CASES)(
        "$engine registers upstream's plugin modules in upstream's order",
        async (engineCase) => {
            const stack = await loadEngineStack(engineCase.engine);
            const expected = expectedUpstreamModules(engineCase, createUpstream(engineCase));
            const actual = stack.upstreamModules;

            expect(
                actual.map(moduleLabel),
                "upstreamModules (by registered services) diverge from upstream",
            ).toEqual(expected.map(moduleLabel));

            const substitutes = new Set<object>(engineCase.substitutes.values());
            expect(
                actual
                    .filter(
                        (module, index) =>
                            !substitutes.has(expected[index]) && module !== expected[index],
                    )
                    .map(moduleLabel),
                "upstreamModules register the same services through a different module object",
            ).toEqual([]);
            actual.forEach((module, index) => {
                if (!substitutes.has(expected[index])) return;
                expect(
                    module,
                    `${moduleLabel(module)} differs from its documented substitute`,
                ).toEqual(expected[index]);
            });
        },
    );

    it.each(CASES)(
        "$engine supplies a default for every option group upstream adds",
        async (engineCase) => {
            const stack = await loadEngineStack(engineCase.engine);
            const baselineKeys = bpmnJsConfigKeys();
            const upstreamKeys = Object.keys(upstreamConfig(createUpstream(engineCase)));

            expect(upstreamKeys.filter((key) => !baselineKeys.has(key)).sort()).toEqual(
                suppliedOptionGroups(stack),
            );
        },
    );

    it.each(CASES)("$engine properties panel defaults match upstream", async (engineCase) => {
        const stack = await loadEngineStack(engineCase.engine);
        const { propertiesPanel } = upstreamConfig(createUpstream(engineCase));

        expect(Object.keys(stack.propertiesPanelDefaults).sort()).toEqual(
            Object.keys(propertiesPanel).sort(),
        );
        expect(stack.propertiesPanelDefaults.tooltip).toBe(propertiesPanel.tooltip);
        expect(feelPopupLinks(stack.propertiesPanelDefaults)).toEqual(
            feelPopupLinks(propertiesPanel),
        );
    });

    it.each(CASES)("$engine popup menu defaults match upstream", async (engineCase) => {
        const stack = await loadEngineStack(engineCase.engine);
        const { popupMenu } = upstreamConfig(createUpstream(engineCase));

        expect(stack.popupMenuDefaults?.defaultTab).toBe(popupMenu?.defaultTab);
        expect(stack.popupMenuDefaults).toEqual(popupMenu);
    });

    it.each(CASES)("$engine moddle extensions match upstream", async (engineCase) => {
        const stack = await loadEngineStack(engineCase.engine);
        const { moddleExtensions } = upstreamConfig(createUpstream(engineCase));

        expect(Object.keys(stack.moddleExtensions).sort()).toEqual(
            Object.keys(moddleExtensions).sort(),
        );
        expect(asRegistered(stack.moddleExtensions)).toEqual(moddleExtensions);
    });
});
