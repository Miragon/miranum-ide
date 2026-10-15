import { DEFINITION_KINDS, type WorkspaceDefinition } from "@miragon/bpmn-modeler-types";

import { DefinitionSearchEntry, type DefinitionSearchEntryProps } from "./DefinitionSearchEntry";
import type { DefinitionSearchPort } from "./DefinitionSearchPort";
import { linkDefinition, type LinkServices } from "./linkDefinition";

/**
 * Below the engine (500) and element-template (300) providers, which rebuild
 * these groups, and above the design-mode filter (10), which must see the entry.
 */
const DEFINITION_SEARCH_PRIORITY = 200;

interface PropertiesEntry {
    id?: string;
}

interface PropertiesGroup {
    id?: string;
    entries?: PropertiesEntry[];
}

interface PropertiesPanel {
    registerProvider(priority: number, provider: DefinitionSearchPropertiesProvider): void;
}

/**
 * Adds a "Search other models" field as the last entry of the message / signal /
 * error / escalation group. The reference select itself stays untouched.
 */
export class DefinitionSearchPropertiesProvider {
    static $inject = [
        "propertiesPanel",
        "bpmnFactory",
        "commandStack",
        "translate",
        "definitionSearchPort",
    ];

    constructor(
        propertiesPanel: PropertiesPanel,
        private readonly bpmnFactory: LinkServices["bpmnFactory"],
        private readonly commandStack: LinkServices["commandStack"],
        private readonly translate: DefinitionSearchEntryProps["translate"],
        private readonly port: DefinitionSearchPort,
    ) {
        propertiesPanel.registerProvider(DEFINITION_SEARCH_PRIORITY, this);
    }

    getGroups(element: unknown) {
        return (groups: PropertiesGroup[]) => {
            for (const kind of DEFINITION_KINDS) {
                const entries = groups.find((group) => group?.id === kind)?.entries;
                if (!entries?.some((entry) => entry?.id === `${kind}Ref`)) {
                    continue;
                }
                const searchEntry: PropertiesEntry &
                    DefinitionSearchEntryProps &
                    Record<string, unknown> = {
                    id: `${kind}Search`,
                    component: DefinitionSearchEntry,
                    isEdited: () => false,
                    kind,
                    search: (query) => this.port.search(query),
                    pick: (definition: WorkspaceDefinition) =>
                        linkDefinition(element, definition, {
                            bpmnFactory: this.bpmnFactory,
                            commandStack: this.commandStack,
                        }),
                    translate: this.translate,
                };
                entries.push(searchEntry);
            }
            return groups;
        };
    }
}
