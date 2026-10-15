import { extractModelDefinitions, type ModelDefinition } from "@miragon/bpmn-modeler-types";

import type { NotifierPort, WorkspacePort } from "../../shared/domain/hostPorts";
import {
    findFilesInScope,
    resolveSearchScope,
    type SearchScope,
} from "../../shared/service/workspaceFileSearch";

const BPMN_GLOB = "**/*.bpmn";

export interface IndexedModel {
    readonly path: string;
    readonly definitions: readonly ModelDefinition[];
}

interface ScopeState {
    readonly scope: SearchScope;
    readonly editors: Set<string>;
    readonly watchers: { dispose(): void }[];
    readonly definitionsByPathKey: Map<string, Promise<readonly ModelDefinition[]>>;
    paths?: Promise<string[]>;
}

/**
 * Messages, signals, errors and escalations of every `.bpmn` file in an
 * editor's search scope. Built lazily on the first search and kept current by
 * file watchers, so edits in other files show up without a reload.
 */
export class WorkspaceDefinitionIndex {
    private readonly scopes = new Map<string, ScopeState>();
    private readonly scopeKeyByEditor = new Map<string, string>();

    constructor(
        private readonly workspace: WorkspacePort,
        private readonly notifier: NotifierPort,
    ) {}

    async modelsFor(editorId: string, sourcePath: string): Promise<IndexedModel[]> {
        const state = this.acquireScope(editorId, sourcePath);
        if (!state) {
            return [];
        }
        const paths = await this.listPaths(state);
        return Promise.all(
            paths.map(async (path) => ({
                path,
                definitions: await this.definitionsOf(state, path),
            })),
        );
    }

    releaseEditor(editorId: string): void {
        const scopeKey = this.scopeKeyByEditor.get(editorId);
        this.scopeKeyByEditor.delete(editorId);
        const state = scopeKey === undefined ? undefined : this.scopes.get(scopeKey);
        if (!state || scopeKey === undefined) {
            return;
        }
        state.editors.delete(editorId);
        if (state.editors.size === 0) {
            state.watchers.forEach((watcher) => watcher.dispose());
            this.scopes.delete(scopeKey);
        }
    }

    dispose(): void {
        for (const state of this.scopes.values()) {
            state.watchers.forEach((watcher) => watcher.dispose());
        }
        this.scopes.clear();
        this.scopeKeyByEditor.clear();
    }

    private acquireScope(editorId: string, sourcePath: string): ScopeState | undefined {
        const knownKey = this.scopeKeyByEditor.get(editorId);
        if (knownKey !== undefined) {
            return this.scopes.get(knownKey);
        }
        const scope = resolveSearchScope(this.workspace, sourcePath);
        if (!scope) {
            return undefined;
        }
        const roots = scope.kind === "workspace-folders" ? scope.folders : [scope.directory];
        const scopeKey = roots.join("\0");
        const state = this.scopes.get(scopeKey) ?? this.createScope(scope, roots);
        this.scopes.set(scopeKey, state);
        state.editors.add(editorId);
        this.scopeKeyByEditor.set(editorId, scopeKey);
        return state;
    }

    private createScope(scope: SearchScope, roots: string[]): ScopeState {
        const state: ScopeState = {
            scope,
            editors: new Set(),
            watchers: [],
            definitionsByPathKey: new Map(),
        };
        const forgetFile = (path: string) => {
            state.definitionsByPathKey.delete(toPathKey(path));
        };
        const forgetFileAndListing = (path: string) => {
            forgetFile(path);
            state.paths = undefined;
        };
        for (const root of roots) {
            try {
                state.watchers.push(
                    this.workspace.createWatcher(root, BPMN_GLOB, {
                        onChange: forgetFile,
                        onCreate: forgetFileAndListing,
                        onDelete: forgetFileAndListing,
                    }),
                );
            } catch (error) {
                this.notifier.logWarning(
                    `Could not watch BPMN files under ${root}: ${(error as Error).message}`,
                );
            }
        }
        return state;
    }

    private listPaths(state: ScopeState): Promise<string[]> {
        if (state.paths) {
            return state.paths;
        }
        const listing = findFilesInScope(this.workspace, state.scope, BPMN_GLOB, {
            matchesWalkedFile: (path) => path.endsWith(".bpmn"),
        });
        state.paths = listing;
        listing.catch(() => {
            if (state.paths === listing) {
                state.paths = undefined;
            }
        });
        return listing;
    }

    private definitionsOf(state: ScopeState, path: string): Promise<readonly ModelDefinition[]> {
        const pathKey = toPathKey(path);
        const cached = state.definitionsByPathKey.get(pathKey);
        if (cached) {
            return cached;
        }
        const read = this.workspace.readFile(path).then(extractModelDefinitions, (error) => {
            this.notifier.logWarning(`Could not read ${path}: ${(error as Error).message}`);
            if (state.definitionsByPathKey.get(pathKey) === read) {
                state.definitionsByPathKey.delete(pathKey);
            }
            return [];
        });
        state.definitionsByPathKey.set(pathKey, read);
        return read;
    }
}

// Watchers on the bridge report platform separators while listings use `/`.
function toPathKey(path: string): string {
    return path.replace(/\\/g, "/");
}
