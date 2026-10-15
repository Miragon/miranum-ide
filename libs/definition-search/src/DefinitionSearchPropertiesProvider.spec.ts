import { describe, expect, it, vi } from "vitest";

import { DefinitionSearchEntry } from "./DefinitionSearchEntry";
import { DefinitionSearchPropertiesProvider } from "./DefinitionSearchPropertiesProvider";

interface Group {
    id: string;
    entries: { id?: string }[];
}

function createProvider() {
    const port = { search: vi.fn().mockResolvedValue([]) };
    const registerProvider = vi.fn();
    const provider = new DefinitionSearchPropertiesProvider(
        { registerProvider },
        { create: vi.fn() },
        { execute: vi.fn() },
        (template) => template,
        port,
    );
    return { provider, port, registerProvider };
}

describe("DefinitionSearchPropertiesProvider", () => {
    it("registers between the engine providers and the design-mode filter", () => {
        const { provider, registerProvider } = createProvider();

        expect(registerProvider).toHaveBeenCalledWith(200, provider);
    });

    it("places the search entry last in each group with a reference select", () => {
        const { provider } = createProvider();
        const groups: Group[] = [
            { id: "general", entries: [{ id: "name" }] },
            { id: "message", entries: [{ id: "messageRef" }, { id: "messageName" }] },
            {
                id: "error",
                entries: [{ id: "errorRef" }, { id: "errorName" }, { id: "errorCode" }],
            },
        ];

        const result = provider.getGroups({})(groups) as Group[];

        expect(result[1].entries.map((entry) => entry.id)).toEqual([
            "messageRef",
            "messageName",
            "messageSearch",
        ]);
        expect(result[2].entries.map((entry) => entry.id)).toEqual([
            "errorRef",
            "errorName",
            "errorCode",
            "errorSearch",
        ]);
        expect(result[1].entries[2]).toMatchObject({
            component: DefinitionSearchEntry,
            kind: "message",
        });
    });

    it("leaves groups without a reference select untouched", () => {
        const { provider } = createProvider();
        const groups = [{ id: "message", entries: [{ id: "messageName" }] }];

        provider.getGroups({})(groups);

        expect(groups[0].entries).toEqual([{ id: "messageName" }]);
    });

    it("forwards the entry's search to the port", async () => {
        const { provider, port } = createProvider();
        const groups = [{ id: "signal", entries: [{ id: "signalRef" }] }];

        const [{ entries }] = provider.getGroups({})(groups) as Group[];
        await (entries[1] as unknown as { search: (query: unknown) => Promise<unknown> }).search({
            kind: "signal",
            text: "stock",
        });

        expect(port.search).toHaveBeenCalledWith({ kind: "signal", text: "stock" });
    });
});
