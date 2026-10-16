/** @jsxImportSource @bpmn-io/properties-panel/preact */
import { render } from "@bpmn-io/properties-panel/preact";
import { act } from "@bpmn-io/properties-panel/preact/test-utils";
import type { WorkspaceDefinition } from "@miragon/bpmn-modeler-types";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { DefinitionSearchEntry } from "./DefinitionSearchEntry";

const PAID: WorkspaceDefinition = {
    kind: "message",
    name: "paid",
    source: { path: "/ws/billing.bpmn", label: "billing.bpmn" },
    usages: [
        { elementId: "Pay", elementName: "Pay invoice", elementType: "endEvent", role: "throw" },
    ],
};

const SHIPPED: WorkspaceDefinition = {
    kind: "message",
    name: "shipped",
    source: { path: "/ws/shipping.bpmn", label: "shipping.bpmn" },
    usages: [],
};

const translate = (template: string, replacements: Record<string, string> = {}) =>
    template.replace(/{([^}]+)}/g, (_, key: string) => replacements[key] ?? key);

let container: HTMLElement;
let scrollIntoView: Mock<Element["scrollIntoView"]>;

beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView = vi.fn<Element["scrollIntoView"]>();
    Element.prototype.scrollIntoView = scrollIntoView;
    container = document.createElement("div");
    document.body.appendChild(container);
});

afterEach(() => {
    render(null, container);
    container.remove();
    vi.useRealTimers();
});

function renderEntry(search: (query: unknown) => Promise<readonly WorkspaceDefinition[]>) {
    const pick = vi.fn();
    act(() => {
        render(
            <DefinitionSearchEntry
                id="messageSearch"
                kind="message"
                search={search}
                pick={pick}
                translate={translate}
            />,
            container,
        );
    });
    return { pick, input: container.querySelector("input") as HTMLInputElement };
}

async function type(input: HTMLInputElement, text: string) {
    act(() => {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
        await vi.advanceTimersByTimeAsync(150);
    });
}

function options() {
    return [...container.querySelectorAll('[role="option"]:not([aria-disabled])')];
}

describe("DefinitionSearchEntry", () => {
    it("searches the port with the typed text after a short pause", async () => {
        const search = vi.fn().mockResolvedValue([PAID, SHIPPED]);
        const { input } = renderEntry(search);

        await type(input, " pai ");

        expect(search).toHaveBeenCalledTimes(1);
        expect(search).toHaveBeenCalledWith({ kind: "message", text: "pai" });
        expect(options().map((option) => option.textContent)).toEqual([
            "paidbilling.bpmn · thrown by Pay invoice",
            "shippedshipping.bpmn",
        ]);
    });

    it("drops results of a query the user has already typed past", async () => {
        let resolveFirst: (found: WorkspaceDefinition[]) => void = () => {};
        const search = vi
            .fn()
            .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
            .mockResolvedValueOnce([SHIPPED]);
        const { input } = renderEntry(search);

        await type(input, "p");
        await type(input, "sh");
        await act(async () => resolveFirst([PAID]));

        expect(options().map((option) => option.textContent)).toEqual(["shippedshipping.bpmn"]);
    });

    it("picks the highlighted result with the keyboard and clears the field", async () => {
        const { input, pick } = renderEntry(vi.fn().mockResolvedValue([PAID, SHIPPED]));
        await type(input, "p");

        act(() => {
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        });
        act(() => {
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        });

        expect(pick).toHaveBeenCalledWith(SHIPPED);
        expect(input.value).toBe("");
        expect(options()).toEqual([]);
    });

    it("scrolls the highlighted result into view while navigating with the keyboard", async () => {
        const { input } = renderEntry(vi.fn().mockResolvedValue([PAID, SHIPPED]));
        await type(input, "p");

        act(() => {
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        });

        expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest" });
        const { contexts } = scrollIntoView.mock;
        expect(contexts[contexts.length - 1]).toBe(options()[1]);
    });

    it("closes the list when the field is cleared", async () => {
        const search = vi.fn().mockResolvedValue([PAID]);
        const { input } = renderEntry(search);
        await type(input, "p");

        await type(input, "  ");

        expect(container.querySelector('[role="listbox"]')).toBeNull();
        expect(search).toHaveBeenCalledTimes(1);
    });

    it("shows a loading hint instead of the previous results while searching", async () => {
        const { input } = renderEntry(
            vi
                .fn()
                .mockResolvedValueOnce([PAID])
                .mockReturnValueOnce(new Promise(() => {})),
        );
        await type(input, "p");

        await type(input, "pa");

        expect(options()).toEqual([]);
        expect(container.querySelector(".definition-search-hint")?.textContent).toBe("Searching…");
        expect(container.querySelector('[role="listbox"]')?.getAttribute("aria-busy")).toBe("true");
    });

    it("reopens the list on click after it was dismissed with Escape", async () => {
        const { input } = renderEntry(vi.fn().mockResolvedValue([PAID]));
        await type(input, "p");
        act(() => {
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        });
        expect(options()).toEqual([]);

        act(() => {
            input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });

        expect(options().map((option) => option.textContent)).toEqual([
            "paidbilling.bpmn · thrown by Pay invoice",
        ]);
    });

    it("keeps the list open when the user presses on it, and picks a result on click", async () => {
        const { input, pick } = renderEntry(vi.fn().mockResolvedValue([PAID]));
        await type(input, "p");
        const list = container.querySelector('[role="listbox"]') as HTMLElement;

        const pressOnList = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
        list.dispatchEvent(pressOnList);
        act(() => {
            (options()[0] as HTMLElement).click();
        });

        expect(pressOnList.defaultPrevented).toBe(true);
        expect(pick).toHaveBeenCalledWith(PAID);
    });

    it("tells the user when the search fails", async () => {
        const { input } = renderEntry(vi.fn().mockRejectedValue(new Error("offline")));

        await type(input, "p");

        expect(container.querySelector(".definition-search-hint")?.textContent).toBe(
            "Search failed",
        );
    });

    it("tells the user when nothing matches", async () => {
        const { input } = renderEntry(vi.fn().mockResolvedValue([]));

        await type(input, "nothing");

        expect(container.querySelector(".definition-search-hint")?.textContent).toBe(
            "No matches in other models",
        );
    });

    it("lists throwers and catchers of a result, shortening long lists", async () => {
        const catchers = ["A", "B", "C", "D"].map((elementId) => ({
            elementId,
            elementType: "startEvent",
            role: "catch" as const,
        }));
        const { input } = renderEntry(
            vi.fn().mockResolvedValue([{ ...PAID, usages: [...PAID.usages, ...catchers] }]),
        );

        await type(input, "p");

        expect(container.querySelector(".definition-search-detail")?.textContent).toBe(
            "billing.bpmn · thrown by Pay invoice · caught by A, B, C, …",
        );
    });
});
