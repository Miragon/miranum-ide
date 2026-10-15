/**
 * Public API of the definition-search feature. Sibling features resolve the
 * workspace search for messages, signals, errors and escalations only through
 * this barrel; reaching into the feature's internals is rejected by the
 * feature-isolation architecture test.
 */
export { DefinitionSearchService, WorkspaceDefinitionIndex } from "@miragon/bpmn-modeler-core";
