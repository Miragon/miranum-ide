import type { WorkspaceDefinition } from "@miragon/bpmn-modeler-types";

export const MOCK_WORKSPACE_DEFINITIONS: WorkspaceDefinition[] = [
    {
        kind: "message",
        name: "OrderPlaced",
        source: { path: "processes/order.bpmn", label: "order.bpmn" },
        usages: [
            {
                elementId: "PlaceOrder",
                elementName: "Place order",
                elementType: "endEvent",
                role: "throw",
            },
        ],
    },
    {
        kind: "message",
        name: "PaymentReceived",
        source: { path: "processes/billing.bpmn", label: "billing.bpmn" },
        usages: [
            {
                elementId: "Pay",
                elementName: "Payment received",
                elementType: "startEvent",
                role: "catch",
            },
        ],
    },
    {
        kind: "signal",
        name: "StockChanged",
        source: { path: "processes/stock.bpmn", label: "stock.bpmn" },
        usages: [],
    },
    {
        kind: "error",
        name: "Payment failed",
        code: "PAYMENT_FAILED",
        source: { path: "processes/billing.bpmn", label: "billing.bpmn" },
        usages: [{ elementId: "Fail", elementType: "endEvent", role: "throw" }],
    },
    {
        kind: "escalation",
        name: "Delivery late",
        code: "LATE",
        source: { path: "processes/shipping.bpmn", label: "shipping.bpmn" },
        usages: [],
    },
];
