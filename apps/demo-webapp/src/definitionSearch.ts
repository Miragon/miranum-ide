import {
    extractModelDefinitions,
    type DefinitionSearchPort,
    type DefinitionSearchQuery,
    type WorkspaceDefinition,
} from "@miragon/bpmn-modeler";
import { MODELS, modelHref } from "./registry";

/**
 * The demo's `definitionSearch` port: an in-memory index over the other BPMN
 * models of the registry — what a host-less consumer would build from its own
 * model store or a server.
 */
export class DemoDefinitionSearch implements DefinitionSearchPort {
    private readonly definitions: WorkspaceDefinition[];

    constructor(currentModelId: string) {
        this.definitions = MODELS.filter(
            (model) => model.type === "bpmn" && model.id !== currentModelId,
        ).flatMap((model) =>
            extractModelDefinitions(model.xml).map((definition) => ({
                ...definition,
                source: { path: modelHref(model), label: model.title },
            })),
        );
    }

    async search({ kind, text }: DefinitionSearchQuery): Promise<WorkspaceDefinition[]> {
        const needle = text.toLowerCase();
        return this.definitions.filter(
            (definition) =>
                definition.kind === kind &&
                [definition.name, definition.code].some((value) =>
                    value?.toLowerCase().includes(needle),
                ),
        );
    }
}
