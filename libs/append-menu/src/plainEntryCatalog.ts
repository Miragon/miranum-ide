// A favourite or a template type pick carries only a BPMN type, so each type maps to the one
// upstream entry that creates its plain element. Typed events, event sub-processes and expanded
// variants stay out: offering them would create a different element than the entry shows.
// Labels are translated, so the upstream action name is the only stable key.
export const PLAIN_ENTRY_ACTION_BY_BPMN_TYPE: Readonly<Record<string, string>> = {
    "bpmn:Task": "task",
    "bpmn:UserTask": "user-task",
    "bpmn:ServiceTask": "service-task",
    "bpmn:SendTask": "send-task",
    "bpmn:ReceiveTask": "receive-task",
    "bpmn:ManualTask": "manual-task",
    "bpmn:BusinessRuleTask": "rule-task",
    "bpmn:ScriptTask": "script-task",
    "bpmn:CallActivity": "call-activity",
    // `elementFactory` creates a sub-process collapsed unless told otherwise.
    "bpmn:SubProcess": "collapsed-subprocess",
    "bpmn:AdHocSubProcess": "collapsed-ad-hoc-subprocess",
    "bpmn:Transaction": "transaction",
    "bpmn:StartEvent": "none-start-event",
    "bpmn:IntermediateThrowEvent": "none-intermediate-throwing",
    "bpmn:BoundaryEvent": "none-boundary-event",
    "bpmn:EndEvent": "none-end-event",
    "bpmn:ExclusiveGateway": "exclusive-gateway",
    "bpmn:ParallelGateway": "parallel-gateway",
    "bpmn:InclusiveGateway": "inclusive-gateway",
    "bpmn:ComplexGateway": "complex-gateway",
    "bpmn:EventBasedGateway": "event-based-gateway",
    "bpmn:DataObjectReference": "data-object-reference",
    "bpmn:DataStoreReference": "data-store-reference",
    "bpmn:Participant": "expanded-pool",
};

const BPMN_TYPE_BY_PLAIN_ACTION = new Map(
    Object.entries(PLAIN_ENTRY_ACTION_BY_BPMN_TYPE).map(([bpmnType, action]) => [action, bpmnType]),
);

const UPSTREAM_ENTRY_ID = /^(?:append|create)-(.+)$/;

export function bpmnTypeOfPlainEntry(entryId: string): string | undefined {
    const action = UPSTREAM_ENTRY_ID.exec(entryId)?.[1];
    return action === undefined ? undefined : BPMN_TYPE_BY_PLAIN_ACTION.get(action);
}
