import { afterEach, describe, expect, it, vi } from "vitest";

import { HostApiImpl, MissingStateError } from "./host";

type ViewState = { mode?: string; zoom?: number };

function createHostBridge(initialState?: ViewState) {
    let persisted = initialState;
    const bridge = {
        getState: vi.fn(() => persisted),
        setState: vi.fn((state: ViewState) => {
            persisted = state;
            return state;
        }),
        postMessage: vi.fn(),
    };
    vi.stubGlobal("acquireVsCodeApi", () => bridge);
    return bridge;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("HostApiImpl", () => {
    it("throws MissingStateError when the host has no persisted state yet", () => {
        createHostBridge(undefined);

        expect(() => new HostApiImpl<ViewState, unknown>().getState()).toThrow(MissingStateError);
    });

    it("returns the state the host persisted", () => {
        createHostBridge({ mode: "design" });

        expect(new HostApiImpl<ViewState, unknown>().getState()).toEqual({ mode: "design" });
    });

    it("persists a copy so later caller mutations do not leak into host state", () => {
        const bridge = createHostBridge();
        const state: ViewState = { mode: "design" };

        new HostApiImpl<ViewState, unknown>().setState(state);
        state.mode = "implement";

        expect(bridge.setState).toHaveBeenCalledWith({ mode: "design" });
    });

    it("merges a partial update over the persisted state", () => {
        const bridge = createHostBridge({ mode: "design", zoom: 1 });

        new HostApiImpl<ViewState, unknown>().updateState({ zoom: 2 });

        expect(bridge.setState).toHaveBeenCalledWith({ mode: "design", zoom: 2 });
    });

    it("rejects a partial update before any state exists, persisting nothing", () => {
        const bridge = createHostBridge(undefined);
        const host = new HostApiImpl<ViewState, unknown>();

        expect(() => host.updateState({ zoom: 2 })).toThrow(MissingStateError);
        expect(bridge.setState).not.toHaveBeenCalled();
    });

    it("forwards messages to the host unchanged", () => {
        const bridge = createHostBridge();
        const message = { type: "GetBpmnFileCommand" };

        new HostApiImpl<ViewState, typeof message>().postMessage(message);

        expect(bridge.postMessage).toHaveBeenCalledWith(message);
    });
});
