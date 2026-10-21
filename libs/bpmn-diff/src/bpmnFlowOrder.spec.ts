import { describe, expect, it } from "vitest";

import {
    buildFlowOrder,
    buildRemovedAnchors,
    sortIdsByOrder,
    type FlowPosition,
    type ModdleElement,
} from "./bpmnFlowOrder";

type Point = { x: number; y: number };

const element = (type: string, id: string, extra: Record<string, unknown> = {}): ModdleElement => ({
    $type: `bpmn:${type}`,
    id,
    ...extra,
});

const sequenceFlow = (
    id: string,
    source: ModdleElement | string,
    target: ModdleElement | string,
): ModdleElement => element("SequenceFlow", id, { sourceRef: source, targetRef: target });

const processOf = (...flowElements: ModdleElement[]): ModdleElement =>
    element("Process", "Process_1", { flowElements });

/** Parsed-definitions stand-in; `layout` maps ids to shape bounds or edge waypoints. */
function definitionsOf(
    rootElements: ModdleElement[],
    layout: Record<string, Point | Point[]> = {},
): ModdleElement {
    const planeElement = Object.entries(layout).map(([id, at]) =>
        Array.isArray(at)
            ? { bpmnElement: { id }, waypoint: at }
            : { bpmnElement: { id }, bounds: at },
    );
    return { $type: "bpmn:Definitions", rootElements, diagrams: [{ plane: { planeElement } }] };
}

const idsInFlowOrder = (order: ReadonlyMap<string, FlowPosition>): string[] =>
    [...order.entries()].sort(([, a], [, b]) => a.flowIndex - b.flowIndex).map(([id]) => id);

const at = (flowIndex: number, y = 0, x = 0): FlowPosition => ({ flowIndex, y, x });

describe("buildFlowOrder", () => {
    it("walks from the start event to the end event, each flow right after its source", () => {
        const start = element("StartEvent", "Start");
        const task = element("Task", "Task");
        const end = element("EndEvent", "End");

        const order = buildFlowOrder(
            definitionsOf([
                processOf(
                    end,
                    sequenceFlow("Flow_2", task, end),
                    task,
                    sequenceFlow("Flow_1", start, task),
                    start,
                ),
            ]),
        );

        expect(idsInFlowOrder(order)).toEqual(["Start", "Flow_1", "Task", "Flow_2", "End"]);
    });

    it("follows sequence flows whose references are plain ids", () => {
        const order = buildFlowOrder(
            definitionsOf([
                processOf(
                    element("EndEvent", "End"),
                    sequenceFlow("Flow_1", "Start", "End"),
                    element("StartEvent", "Start"),
                ),
            ]),
        );

        expect(idsInFlowOrder(order)).toEqual(["Start", "Flow_1", "End"]);
    });

    it("visits parallel branches top to bottom, then left to right", () => {
        const fork = element("ParallelGateway", "Fork");
        const lower = element("Task", "Lower");
        const upperRight = element("Task", "UpperRight");
        const upperLeft = element("Task", "UpperLeft");

        const order = buildFlowOrder(
            definitionsOf(
                [
                    processOf(
                        fork,
                        lower,
                        upperRight,
                        upperLeft,
                        sequenceFlow("ToLower", fork, lower),
                        sequenceFlow("ToUpperRight", fork, upperRight),
                        sequenceFlow("ToUpperLeft", fork, upperLeft),
                        element("StartEvent", "Start"),
                        sequenceFlow("ToFork", "Start", fork),
                    ),
                ],
                {
                    Lower: { x: 300, y: 300 },
                    UpperRight: { x: 400, y: 100 },
                    UpperLeft: { x: 300, y: 100 },
                },
            ),
        );

        expect(idsInFlowOrder(order)).toEqual([
            "Start",
            "ToFork",
            "Fork",
            "ToUpperLeft",
            "ToUpperRight",
            "ToLower",
            "UpperLeft",
            "UpperRight",
            "Lower",
        ]);
    });

    it("appends elements no start event reaches after the flow, in reading order", () => {
        const order = buildFlowOrder(
            definitionsOf(
                [
                    processOf(
                        element("Task", "Lonely_Bottom"),
                        element("Task", "Lonely_Top"),
                        element("StartEvent", "Start"),
                    ),
                ],
                {
                    Start: { x: 900, y: 900 },
                    Lonely_Bottom: { x: 0, y: 200 },
                    Lonely_Top: { x: 500, y: 100 },
                },
            ),
        );

        expect(idsInFlowOrder(order)).toEqual(["Start", "Lonely_Top", "Lonely_Bottom"]);
    });

    it("walks an event sub-process from its own start event and orphans only its shape", () => {
        const errorStart = element("StartEvent", "ErrorStart");
        const handle = element("Task", "Handle");
        const eventSubProcess = element("SubProcess", "EventSubProcess", {
            triggeredByEvent: true,
            flowElements: [errorStart, handle, sequenceFlow("ToHandle", errorStart, handle)],
        });

        const order = idsInFlowOrder(
            buildFlowOrder(
                definitionsOf(
                    [
                        processOf(
                            element("StartEvent", "Start"),
                            element("EndEvent", "End"),
                            sequenceFlow("ToEnd", "Start", "End"),
                            eventSubProcess,
                        ),
                    ],
                    {
                        Start: { x: 100, y: 100 },
                        End: { x: 300, y: 100 },
                        EventSubProcess: { x: 50, y: 250 },
                        ErrorStart: { x: 100, y: 300 },
                        Handle: { x: 200, y: 300 },
                    },
                ),
            ),
        );

        expect(order.at(-1)).toBe("EventSubProcess");
        expect(order.indexOf("ErrorStart")).toBeLessThan(order.indexOf("Handle"));
    });

    it("walks a process referenced by both a participant and the root elements once", () => {
        const start = element("StartEvent", "Start");
        const end = element("EndEvent", "End");
        const process = processOf(start, end, sequenceFlow("Flow_1", start, end));
        const collaboration = element("Collaboration", "Collaboration_1", {
            participants: [element("Participant", "Participant_1", { processRef: process })],
        });

        const order = buildFlowOrder(definitionsOf([collaboration, process]));

        expect(idsInFlowOrder(order)).toEqual(["Start", "Flow_1", "End"]);
        expect([...order.values()].map((position) => position.flowIndex).sort()).toEqual([0, 1, 2]);
    });

    it("positions shapes by their bounds and flows by their waypoint midpoint", () => {
        const start = element("StartEvent", "Start");
        const end = element("EndEvent", "End");

        const order = buildFlowOrder(
            definitionsOf([processOf(start, end, sequenceFlow("Flow_1", start, end))], {
                Start: { x: 10, y: 20 },
                Flow_1: [
                    { x: 0, y: 0 },
                    { x: 100, y: 50 },
                ],
            }),
        );

        expect(order.get("Start")).toMatchObject({ x: 10, y: 20 });
        expect(order.get("Flow_1")).toMatchObject({ x: 50, y: 25 });
        expect(order.get("End")).toMatchObject({ x: 0, y: 0 });
    });

    it("places a flow without diagram info at its source's position", () => {
        const start = element("StartEvent", "Start");
        const end = element("EndEvent", "End");

        const order = buildFlowOrder(
            definitionsOf([processOf(start, end, sequenceFlow("Flow_1", start, end))], {
                Start: { x: 10, y: 20 },
            }),
        );

        expect(order.get("Flow_1")).toMatchObject({ x: 10, y: 20 });
    });
});

describe("buildRemovedAnchors", () => {
    const before = (...flowElements: ModdleElement[]) =>
        definitionsOf([processOf(...flowElements)]);

    it("returns no anchors when nothing was removed", () => {
        expect(buildRemovedAnchors([], before(element("Task", "Task")), new Map())).toEqual(
            new Map(),
        );
    });

    it("places a removed node just after its surviving predecessor", () => {
        const anchors = buildRemovedAnchors(
            ["Removed"],
            before(
                element("Task", "Before"),
                element("Task", "Removed"),
                sequenceFlow("In", "Before", "Removed"),
            ),
            new Map([["Before", at(3, 40, 50)]]),
        );

        expect(anchors.get("Removed")).toEqual(at(3.5, 40, 50));
    });

    it("places a removed node just after its surviving incoming flow when the source is gone", () => {
        const anchors = buildRemovedAnchors(
            ["Removed"],
            before(element("Task", "Removed"), sequenceFlow("In", "GoneSource", "Removed")),
            new Map([["In", at(4)]]),
        );

        expect(anchors.get("Removed")?.flowIndex).toBe(4.25);
    });

    it("places a removed node just before its surviving successor when no predecessor survived", () => {
        const anchors = buildRemovedAnchors(
            ["Removed"],
            before(
                element("Task", "Removed"),
                element("Task", "After"),
                sequenceFlow("Out", "Removed", "After"),
            ),
            new Map([["After", at(6)]]),
        );

        expect(anchors.get("Removed")?.flowIndex).toBe(5.5);
    });

    it("places a removed node just before its surviving outgoing flow when the target is gone", () => {
        const anchors = buildRemovedAnchors(
            ["Removed"],
            before(element("Task", "Removed"), sequenceFlow("Out", "Removed", "GoneTarget")),
            new Map([["Out", at(6)]]),
        );

        expect(anchors.get("Removed")?.flowIndex).toBe(5.75);
    });

    it("anchors a removed sequence flow after its source, or else before its target", () => {
        const graph = before(
            element("Task", "Source"),
            element("Task", "Target"),
            sequenceFlow("RemovedFlow", "Source", "Target"),
        );

        expect(
            buildRemovedAnchors(["RemovedFlow"], graph, new Map([["Source", at(2)]])).get(
                "RemovedFlow",
            )?.flowIndex,
        ).toBe(2.5);
        expect(
            buildRemovedAnchors(["RemovedFlow"], graph, new Map([["Target", at(2)]])).get(
                "RemovedFlow",
            )?.flowIndex,
        ).toBe(1.5);
    });

    it("leaves out removed ids with no surviving neighbour or no trace in the before graph", () => {
        const anchors = buildRemovedAnchors(
            ["Isolated", "Unknown"],
            before(element("Task", "Isolated")),
            new Map([["Elsewhere", at(0)]]),
        );

        expect(anchors.size).toBe(0);
    });
});

describe("sortIdsByOrder", () => {
    it("sorts by flow index, breaking ties top to bottom, then left to right", () => {
        const primary = new Map([
            ["Third", at(2)],
            ["SecondRight", at(1, 100, 200)],
            ["SecondLeft", at(1, 100, 100)],
            ["SecondTop", at(1, 50, 900)],
            ["First", at(0)],
        ]);

        expect(sortIdsByOrder([...primary.keys()], primary)).toEqual([
            "First",
            "SecondTop",
            "SecondLeft",
            "SecondRight",
            "Third",
        ]);
    });

    it("falls back to the secondary order and sinks unknown ids to the end in input order", () => {
        const primary = new Map([
            ["A", at(0)],
            ["B", at(1)],
        ]);
        const secondary = new Map([["RemovedBetween", at(0.5)]]);

        expect(
            sortIdsByOrder(
                ["Unknown_1", "B", "Unknown_2", "RemovedBetween", "A"],
                primary,
                secondary,
            ),
        ).toEqual(["A", "RemovedBetween", "B", "Unknown_1", "Unknown_2"]);
    });
});
