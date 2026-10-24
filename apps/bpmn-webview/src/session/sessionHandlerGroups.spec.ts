import { describe, expect, it, vi } from "vitest";

import type { SurfaceHandle } from "../surface";
import { createLintBridge } from "./lintBridge";
import { createProtocolCapabilities } from "./protocolCapabilities";
import { resolveClipboard } from "./protocolClipboard";
import { createSurfaceRequests } from "./surfaceRequests";

// bootstrap spreads these into one session table, where TypeScript reports neither
// a type two groups both handle nor which of them wins.
function sessionHandlerGroups(): Record<string, object> {
    const host = { postMessage: vi.fn() };
    const getSurface = (): SurfaceHandle => {
        throw new Error("no surface in a key-set spec");
    };
    return {
        surfaceRequests: createSurfaceRequests(host, getSurface, {
            hostModelerState: { rememberSettings: vi.fn(), rememberOpenScripts: vi.fn() },
            theme: { setMode: vi.fn() },
            replies: { elementTemplates: { done: vi.fn() }, settings: { done: vi.fn() } },
        }).handlers,
        lintBridge: createLintBridge(
            host,
            { linting: undefined, onLintResults: undefined },
            getSurface,
        ).handlers,
        clipboard: resolveClipboard(undefined, { isDevelopment: false, host }).handlers,
        protocolCapabilities: createProtocolCapabilities(host, getSurface).handlers,
    };
}

describe("session handler groups", () => {
    it("leave each message type to a single group", () => {
        const groupsByType = new Map<string, string[]>();
        for (const [group, handlers] of Object.entries(sessionHandlerGroups())) {
            for (const type of Object.keys(handlers)) {
                groupsByType.set(type, [...(groupsByType.get(type) ?? []), group]);
            }
        }

        const sharedTypes = [...groupsByType].filter(([, groups]) => groups.length > 1);

        expect(sharedTypes).toEqual([]);
    });

    // A spread copies only own enumerable keys, so a group without them would vanish from the table.
    it.each(Object.entries(sessionHandlerGroups()))(
        "%s spreads its handlers as own keys",
        (_group, handlers) => {
            expect(Object.keys(handlers)).not.toEqual([]);
        },
    );
});
