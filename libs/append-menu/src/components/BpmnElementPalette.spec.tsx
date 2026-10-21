import { render, type ComponentProps } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { group } from "../__fixtures__/entries";
import { flattenPaletteItems, processPaletteGroups } from "../filtering";
import type { BpmnElementGroup } from "../types";
import { BpmnElementPalette } from "./BpmnElementPalette";

const tasks = group("tasks", "Tasks", [
    ["append-user-task", "User task"],
    ["append-service-task", "Service task", { disabled: true }],
]);
const gateways = group("gateways", "Gateways", [["append-exclusive-gateway", "Exclusive gateway"]]);
const other = group("other", "Other", [["custom-entry", "Custom"]]);

let container: HTMLElement;

beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
});

afterEach(() => {
    render(null, container);
    container.remove();
});

function renderPalette(
    groups: BpmnElementGroup[],
    options: { favourites?: string[]; search?: string; appliesTo?: string[] } = {},
    overrides: Partial<ComponentProps<typeof BpmnElementPalette>> = {},
) {
    const processed = processPaletteGroups(
        groups,
        options.favourites ?? [],
        options.search ?? "",
        options.appliesTo ? new Set(options.appliesTo) : null,
    );
    act(() => {
        render(
            <BpmnElementPalette
                favouriteEntries={processed.favouriteEntries}
                groups={processed.groups}
                translate={(text) => `translated:${text}`}
                expanded
                highlightedKey={null}
                onToggleExpand={vi.fn()}
                onSelect={vi.fn()}
                {...overrides}
            />,
            container,
        );
    });
    return processed;
}

const button = (navKey: string) =>
    container.querySelectorAll<HTMLButtonElement>(`[data-nav-key="${navKey}"]`);

describe("BpmnElementPalette", () => {
    it("renders exactly one button per navigable item, keyed like the keyboard order", () => {
        const processed = renderPalette([tasks, gateways], {
            favourites: ["bpmn:ExclusiveGateway"],
        });

        const navigable = flattenPaletteItems(processed).filter((item) => !item.hidden);
        expect(navigable.length).toBeGreaterThan(0);
        for (const item of navigable) {
            expect(button(item.key)).toHaveLength(1);
            expect(button(item.key)[0].disabled).toBe(item.disabled);
        }
        expect(container.querySelectorAll(".am-bpmn-button")).toHaveLength(navigable.length);
    });

    it("marks the highlighted button", () => {
        renderPalette([tasks], {}, { highlightedKey: "grp:tasks:append-user-task" });

        expect(button("grp:tasks:append-user-task")[0].classList).toContain(
            "am-bpmn-button--focused",
        );
    });

    it("omits a group whose entries are all filtered out", () => {
        renderPalette([tasks, gateways], { search: "gateway" });

        const titles = [...container.querySelectorAll(".am-bpmn-group-title")].map(
            (title) => title.textContent,
        );
        expect(titles).toEqual(["Gateways"]);
    });

    it("translates only the synthesized Other group title", () => {
        renderPalette([gateways, other]);

        const titles = [...container.querySelectorAll(".am-bpmn-group-title")].map(
            (title) => title.textContent,
        );
        expect(titles).toEqual(["Gateways", "translated:Other"]);
    });
});
