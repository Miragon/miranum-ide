import { describe, expect, it } from "vitest";

import {
    extractCategories,
    filterTemplates,
    flattenPaletteItems,
    processPaletteGroups,
    resolveSelectedType,
} from "./filtering";
import { group, templateEntry } from "./__fixtures__/entries";
import type { BpmnElementGroup } from "./types";

describe("filterTemplates", () => {
    const entries = [
        templateEntry("http", "HTTP Worker", { appliesTo: ["bpmn:ServiceTask"], search: ["rest"] }),
        templateEntry("mail", "Send Mail", { appliesTo: ["bpmn:SendTask"] }),
        templateEntry("user", "Approval", {
            appliesTo: ["bpmn:UserTask"],
            category: { id: "human", name: "Human" },
        }),
    ];

    it("returns all entries for an empty search and no category", () => {
        expect(filterTemplates(entries, "", null)).toHaveLength(3);
    });

    it("matches templates by their appliesTo type label", () => {
        // "service task" must surface the bpmn:ServiceTask template.
        const result = filterTemplates(entries, "service task", null);
        expect(result.map((e) => e.template?.id)).toEqual(["http"]);
    });

    it("matches by keyword search terms", () => {
        expect(filterTemplates(entries, "rest", null).map((e) => e.template?.id)).toEqual(["http"]);
    });

    it("filters by active category", () => {
        expect(filterTemplates(entries, "", "human").map((e) => e.template?.id)).toEqual(["user"]);
    });
});

describe("extractCategories", () => {
    it("returns unique categories from the unfiltered list", () => {
        const entries = [
            templateEntry("a", "A", { category: { id: "c1", name: "One" } }),
            templateEntry("b", "B", { category: { id: "c2", name: "Two" } }),
            templateEntry("c", "C", { category: { id: "c1", name: "One" } }),
            templateEntry("d", "D"),
        ];
        expect(extractCategories(entries)).toEqual([
            { id: "c1", name: "One" },
            { id: "c2", name: "Two" },
        ]);
    });
});

describe("processPaletteGroups", () => {
    const groups = [
        group("tasks", "Tasks", [
            ["create.service-task", "Service Task"],
            ["create.user-task", "User Task"],
        ]),
        group("gateways", "Gateways", [["create.exclusive-gateway", "Exclusive Gateway"]]),
    ];

    it("marks nothing disabled or hidden without a filter or search", () => {
        const p = processPaletteGroups(groups, [], "", null);
        const flags = p.groups.flatMap((g) => g.entries.map((e) => [e.disabled, e.hidden]));
        expect(flags.every(([d, h]) => !d && !h)).toBe(true);
    });

    it("hides entries that fail the appliesTo filter", () => {
        const p = processPaletteGroups(groups, [], "", new Set(["bpmn:ServiceTask"]));
        const service = p.groups[0].entries.find((e) => e.entry.label === "Service Task")!;
        const user = p.groups[0].entries.find((e) => e.entry.label === "User Task")!;
        expect(service.hidden).toBe(false);
        expect(user.hidden).toBe(true);
        expect(user.disabled).toBe(false);
    });

    it("hides entries that fail the search but leaves them enabled", () => {
        const p = processPaletteGroups(groups, [], "gateway", null);
        const gateway = p.groups[1].entries[0];
        const service = p.groups[0].entries[0];
        expect(gateway.hidden).toBe(false);
        expect(service.hidden).toBe(true);
        expect(service.disabled).toBe(false);
    });

    it("resolves favourites in the given order", () => {
        const p = processPaletteGroups(groups, ["bpmn:UserTask", "bpmn:ServiceTask"], "", null);
        expect(p.favouriteEntries.map((e) => e.entry.label)).toEqual(["User Task", "Service Task"]);
    });
});

describe("flattenPaletteItems", () => {
    const groups = [group("tasks", "Tasks", [["create.service-task", "Service Task"]])];

    it("namespaces favourite and group instances of the same entry distinctly", () => {
        const processed = processPaletteGroups(groups, ["bpmn:ServiceTask"], "", null);
        const items = flattenPaletteItems(processed);
        expect(items.map((i) => i.key)).toEqual([
            "fav:create.service-task",
            "grp:tasks:create.service-task",
        ]);
    });

    it("carries the hidden flag through to the flattened items", () => {
        const processed = processPaletteGroups(groups, [], "gateway", new Set(["bpmn:UserTask"]));
        const item = flattenPaletteItems(processed).find((i) => i.key.startsWith("grp:"))!;
        expect(item.hidden).toBe(true); // fails both the appliesTo filter and the search
        expect(item.disabled).toBe(false);
    });

    it("exposes the raw entry id alongside the namespaced key", () => {
        const processed = processPaletteGroups(groups, ["bpmn:ServiceTask"], "", null);
        const items = flattenPaletteItems(processed);
        expect(items.map((i) => i.id)).toEqual(["create.service-task", "create.service-task"]);
    });
});

describe("resolveSelectedType", () => {
    const appliesTo = ["bpmn:ServiceTask", "bpmn:SendTask"];

    it("resolves the type by normalized label", () => {
        expect(resolveSelectedType("append-send-task", "Send task", appliesTo)).toBe(
            "bpmn:SendTask",
        );
    });

    it("resolves the type by entry id when the label does not match", () => {
        expect(resolveSelectedType("append-send-task", "Mail", appliesTo)).toBe("bpmn:SendTask");
    });

    it("prefers the exact label match over an id substring, avoiding type shadowing", () => {
        // `append-user-task` contains "task", which would match bpmn:Task via
        // id-substring, but the label pins bpmn:UserTask.
        expect(
            resolveSelectedType("append-user-task", "User task", ["bpmn:Task", "bpmn:UserTask"]),
        ).toBe("bpmn:UserTask");
    });

    it("returns undefined when no type matches", () => {
        expect(resolveSelectedType("append-gateway", "Gateway", appliesTo)).toBeUndefined();
    });
});

// Ids as bpmn-js-create-append-anything builds them (`append-<actionName>`). Upstream
// translates the labels, so a German UI hands the palette the German ones.
describe("with upstream create-append-anything entries", () => {
    const englishTasks = group("tasks", "Tasks", [
        ["append-task", "Task"],
        ["append-user-task", "User task"],
        ["append-service-task", "Service task"],
        ["append-rule-task", "Business rule task"],
    ]);
    const germanTasks = group("tasks", "Aufgaben", [
        ["append-task", "Aufgabe"],
        ["append-user-task", "Benutzer-Aufgabe"],
        ["append-service-task", "Serviceaufgabe"],
        ["append-rule-task", "Regel Aufgabe"],
    ]);
    const englishEvents = group("events", "Events", [
        ["append-none-intermediate-throwing", "Intermediate throw event"],
    ]);
    const germanEvents = group("events", "Ereignisse", [
        ["append-none-intermediate-throwing", "Zwischenereignis (auslösend)"],
    ]);

    const favouriteIds = (groups: BpmnElementGroup[], favourites: string[]) =>
        processPaletteGroups(groups, favourites, "", null).favouriteEntries.map((e) => e.id);
    const visibleIds = (groups: BpmnElementGroup[], appliesTo: string[]) =>
        processPaletteGroups(groups, [], "", new Set(appliesTo))
            .groups.flatMap((g) => g.entries)
            .filter((e) => !e.hidden)
            .map((e) => e.id);

    it("resolves favourites whose id does not name the type through the English label", () => {
        expect(
            favouriteIds(
                [englishTasks, englishEvents],
                ["bpmn:BusinessRuleTask", "bpmn:IntermediateThrowEvent"],
            ),
        ).toEqual(["append-rule-task", "append-none-intermediate-throwing"]);
    });

    it("resolves favourites through the entry id when the label is translated", () => {
        expect(
            favouriteIds([germanTasks], ["bpmn:ServiceTask", "bpmn:UserTask", "bpmn:Task"]),
        ).toEqual(["append-service-task", "append-user-task", "append-task"]);
    });

    it("drops favourites named by neither the entry id nor the translated label", () => {
        expect(
            favouriteIds(
                [germanTasks, germanEvents],
                ["bpmn:BusinessRuleTask", "bpmn:IntermediateThrowEvent"],
            ),
        ).toEqual([]);
    });

    it("keeps every task variant pickable when a template applies to bpmn:Task", () => {
        expect(visibleIds([englishTasks], ["bpmn:Task", "bpmn:UserTask"])).toEqual([
            "append-task",
            "append-user-task",
            "append-service-task",
            "append-rule-task",
        ]);
    });

    it("resolves a translated entry through its id when that names the type", () => {
        expect(
            resolveSelectedType("append-service-task", "Serviceaufgabe", [
                "bpmn:ServiceTask",
                "bpmn:SendTask",
            ]),
        ).toBe("bpmn:ServiceTask");
    });
});
