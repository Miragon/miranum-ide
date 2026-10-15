# `@miragon/bpmn-modeler-definition-search`

Private bpmn-js module, inlined into `@miragon/bpmn-modeler`. It adds a
**Search other models** field as the last entry of the message, signal, error
and escalation groups of the properties panel.

Results come from a `DefinitionSearchPort` that the consumer supplies through
`capabilities.definitionSearch`. Picking a result creates a local copy of the
definition in the current model, or reuses an equal one, and links it. BPMN
cannot reference definitions in other files, so the saved model stays
self-contained.

`extractModelDefinitions(xml)` from `@miragon/bpmn-modeler-types` lists the
definitions and their throw/catch usages of a BPMN file, for consumers that
build their own index.
