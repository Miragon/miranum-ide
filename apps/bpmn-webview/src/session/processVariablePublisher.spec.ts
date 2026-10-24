import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Command, Query } from "@miragon/bpmn-modeler-shared";

import { createProcessVariablePublisher } from "./processVariablePublisher";

type Posted = { type: string; variables?: { name: string }[] };

function createHost() {
    const sent: Posted[] = [];
    return {
        sent,
        postMessage: vi.fn((message: Command | Query) => {
            sent.push(message as unknown as Posted);
        }),
    };
}

const noVariables = {};
const totalVariable = {
    rootElements: [
        {
            $type: "bpmn:Process",
            flowElements: [{ $type: "bpmn:ScriptTask", id: "Task_1", resultVariable: "total" }],
        },
    ],
};

function publisherOn(definitions: unknown = noVariables) {
    const host = createHost();
    const modeler = { getDefinitions: vi.fn(() => definitions) };
    let reloading = false;
    const publisher = createProcessVariablePublisher(host, modeler as never, {
        isReloading: () => reloading,
    });
    return {
        host,
        modeler,
        publisher,
        setDefinitions: (next: unknown) => {
            definitions = next;
        },
        beginReload: () => {
            reloading = true;
        },
    };
}

const publishedNames = (host: ReturnType<typeof createHost>) =>
    host.sent.map((message) => message.variables?.map((variable) => variable.name));

describe("createProcessVariablePublisher", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("publishes the variables once a burst of changes settles", async () => {
        const { host, publisher, setDefinitions } = publisherOn();

        publisher.schedule();
        setDefinitions(totalVariable);
        publisher.schedule();
        await vi.advanceTimersByTimeAsync(299);
        expect(host.postMessage).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);

        expect(host.sent.map((message) => message.type)).toEqual(["UpdateScriptVariablesCommand"]);
        expect(publishedNames(host)).toEqual([["total"]]);
    });

    it("skips a variable set identical to the last one it published", async () => {
        const { host, publisher, setDefinitions } = publisherOn();

        publisher.schedule();
        await vi.advanceTimersByTimeAsync(300);
        publisher.schedule();
        await vi.advanceTimersByTimeAsync(300);
        setDefinitions(totalVariable);
        publisher.schedule();
        await vi.advanceTimersByTimeAsync(300);

        expect(publishedNames(host)).toEqual([[], ["total"]]);
    });

    it("drops the publish a cancel catches before it fires", async () => {
        const { host, modeler, publisher } = publisherOn();

        publisher.schedule();
        publisher.cancel();
        await vi.advanceTimersByTimeAsync(300);

        expect(modeler.getDefinitions).not.toHaveBeenCalled();
        expect(host.postMessage).not.toHaveBeenCalled();
    });

    it("neither schedules nor publishes once an engine reload began", async () => {
        const { host, modeler, publisher, beginReload } = publisherOn();

        publisher.schedule();
        beginReload();
        await vi.advanceTimersByTimeAsync(300);
        publisher.schedule();
        await vi.advanceTimersByTimeAsync(300);

        expect(modeler.getDefinitions).not.toHaveBeenCalled();
        expect(host.postMessage).not.toHaveBeenCalled();
    });
});
