import {
    type BpmnFileQuery,
    createFlushResponder,
    createResolver,
    type FlushSource,
    HostDocumentRevisions,
    type InertLock,
    type InertLockGroup,
    LogErrorCommand,
    SyncDocumentCommand,
} from "@miragon/bpmn-modeler-shared";
import { asyncDebounce, serializeAsync, type DetectedEngine } from "@miragon/bpmn-modeler-types";

import type { HostChannel } from "./hostChannel";

/** The document I/O the session needs from whichever surface is live. */
export interface BpmnDocumentSurface {
    importHostDocument(content: string | undefined): Promise<void>;
    exportDocument(): Promise<string>;
    afterSync(): void;
    refreshDiagram(): Promise<void>;
    centerOnElement(elementId: string): void;
}

/** The page teardown an engine change runs before the reload replaces the page. */
export interface BpmnPageLifecycle {
    cancelPendingSurfaceWork(): void;
    flushViewport(): void;
    destroySurface(): void;
    reloadPage(): void;
}

interface BpmnDocumentSessionPorts {
    readonly surface: BpmnDocumentSurface;
    readonly page: BpmnPageLifecycle;
    readonly pageInertLocks: InertLockGroup;
}

/**
 * The BPMN webview's document lifecycle: host revisions, the serialized
 * host-update queue, the debounced outbound sync, mode-switch and engine-reload
 * latches, and actions (refresh, focus) deferred until the modeler is ready.
 */
export class BpmnDocumentSession implements FlushSource {
    private readonly revisions = new HostDocumentRevisions();
    private readonly initialHostFile = createResolver<BpmnFileQuery>();
    private latestFile: BpmnFileQuery | undefined;
    // The surface was built for the initial file's engine; any other engine reloads the page.
    private documentEngine: DetectedEngine;
    private initialized = false;
    private canImportHostUpdates = false;
    private engineReloadPending = false;
    private switchPending = false;
    private initialSurfaceReady = false;
    private refreshDiagramWhenReady = false;
    private pendingFocusId: string | undefined;
    private pendingActionDrain: Promise<void> | undefined;

    private readonly serializedModelerOperation = serializeAsync(
        async (operation: () => Promise<void>): Promise<void> => operation(),
    );
    private readonly debouncedHostUpdate = asyncDebounce(
        (content: string | undefined, documentRevision: number) =>
            this.serializedImport(content, documentRevision),
        100,
    );
    // The host recovers the sub-300ms tail through the flush protocol.
    private readonly debouncedSync = asyncDebounce(() => this.sendChanges(), 300, {
        maxWait: 1000,
    });

    private readonly modeSwitchLock: InertLock;
    private readonly destructiveFlushLock: InertLock;
    // Never released: the page stays locked until the reload replaces it.
    private readonly engineReloadLock: InertLock;

    private readonly surface: BpmnDocumentSurface;
    private readonly page: BpmnPageLifecycle;

    readonly respondToFlush = createFlushResponder(this, (reply) => this.host.postMessage(reply));

    constructor(
        private readonly host: HostChannel,
        { surface, page, pageInertLocks }: BpmnDocumentSessionPorts,
    ) {
        this.surface = surface;
        this.page = page;
        this.modeSwitchLock = pageInertLocks.createLock();
        this.destructiveFlushLock = pageInertLocks.createLock();
        this.engineReloadLock = pageInertLocks.createLock();
    }

    get latestHostFile(): BpmnFileQuery | undefined {
        return this.latestFile;
    }

    get isReloadingForEngine(): boolean {
        return this.engineReloadPending;
    }

    get isSwitching(): boolean {
        return this.switchPending;
    }

    waitForInitialHostFile(): Promise<BpmnFileQuery | undefined> {
        return this.initialHostFile.wait();
    }

    async receiveHostFile(query: BpmnFileQuery): Promise<void> {
        const documentRevision = query.documentRevision ?? 0;
        const receipt = this.revisions.receive(documentRevision);
        if (receipt === "stale") return;
        this.latestFile = query;

        if (receipt === "initial") {
            this.initialHostFile.done(query);
            return;
        }

        // A host push is authoritative; drop any pending outbound sync so a
        // stale export can't clobber it after the re-import.
        this.debouncedSync.cancel();
        if (!this.canImportHostUpdates) return;
        if (query.engine !== this.documentEngine) {
            await this.reloadForEngineChange();
            return;
        }
        try {
            await this.debouncedHostUpdate(query.content, documentRevision);
        } finally {
            if (this.initialized) {
                await this.drainPendingActions();
            }
        }
    }

    /**
     * Imports the newest host file into a surface built for `firstFile`'s
     * engine; `false` when the boot must stop.
     */
    async openInitialDocument(firstFile: BpmnFileQuery | undefined): Promise<boolean> {
        this.documentEngine = firstFile?.engine;
        let importedFile = this.latestFile ?? firstFile;
        while (importedFile) {
            if (importedFile.engine !== this.documentEngine) {
                await this.reloadForEngineChange();
                return false;
            }
            try {
                await this.serializedImport(importedFile.content, importedFile.documentRevision);
                break;
            } catch (error) {
                if (this.latestFile && this.latestFile !== importedFile) {
                    this.reportHostImportError(error);
                    importedFile = this.latestFile;
                    continue;
                }
                const message = error instanceof Error ? error.message : String(error);
                this.host.postMessage(new LogErrorCommand(`Unable to open XML\n${message}`));
                return false;
            }
        }

        this.canImportHostUpdates = true;

        if (this.latestFile && this.latestFile !== importedFile) {
            if (this.latestFile.engine !== this.documentEngine) {
                await this.reloadForEngineChange();
                return false;
            }
            try {
                await this.debouncedHostUpdate(
                    this.latestFile.content,
                    this.latestFile.documentRevision,
                );
            } catch (error) {
                this.reportHostImportError(error);
            }
        }
        await this.flushPendingHostUpdates();
        return !this.engineReloadPending;
    }

    markInitialized(): void {
        this.initialized = true;
    }

    markSurfaceReady(): void {
        this.initialSurfaceReady = true;
    }

    async requestDiagramRefresh(): Promise<void> {
        this.refreshDiagramWhenReady = true;
        if (this.initialized) {
            await this.drainPendingActions();
        }
    }

    async focusElement(elementId: string): Promise<void> {
        this.pendingFocusId = elementId;
        if (this.initialized) {
            await this.drainPendingActions();
        }
    }

    requestMode(switchMode: () => Promise<void>): void {
        if (!this.initialSurfaceReady || this.switchPending || this.engineReloadPending) return;
        void this.serializedModelerOperation(switchMode);
    }

    setSwitching(busy: boolean): void {
        this.switchPending = busy;
        if (busy) {
            this.modeSwitchLock.acquire();
        } else {
            this.modeSwitchLock.release();
        }
    }

    scheduleSync(): void {
        void this.debouncedSync();
    }

    cancelSync(): void {
        this.debouncedSync.cancel();
    }

    flushSyncOnHide(): void {
        void this.debouncedSync.flush();
    }

    async flushPendingSync(): Promise<void> {
        while (this.debouncedSync.pending()) {
            await this.debouncedSync.flush();
        }
    }

    drainPendingActions(): Promise<void> {
        if (!this.pendingActionDrain) {
            this.pendingActionDrain = this.runPendingActions().finally(() => {
                this.pendingActionDrain = undefined;
            });
        }
        return this.pendingActionDrain;
    }

    async reloadForEngineChange(): Promise<void> {
        if (this.engineReloadPending) return;
        this.engineReloadPending = true;
        this.initialized = false;
        this.canImportHostUpdates = false;
        this.debouncedSync.cancel();
        this.debouncedHostUpdate.cancel();
        this.page.cancelPendingSurfaceWork();
        this.refreshDiagramWhenReady = false;
        this.pendingFocusId = undefined;
        this.engineReloadLock.acquire();

        await this.serializedModelerOperation(async () => {
            try {
                this.debouncedSync.cancel();
                this.debouncedHostUpdate.cancel();
                await this.debouncedSync.flush();
                this.page.flushViewport();
            } finally {
                try {
                    this.page.destroySurface();
                } finally {
                    this.page.reloadPage();
                }
            }
        });
    }

    isReady(): boolean {
        return this.initialized;
    }

    hasPendingSync(): boolean {
        return this.debouncedSync.pending();
    }

    hasPendingHostUpdate(): boolean {
        return this.debouncedHostUpdate.pending();
    }

    hostUpdateVersion(): number {
        return this.revisions.version;
    }

    documentRevision(): number {
        return this.revisions.representedRevision;
    }

    beginDestructiveFlush(): void {
        this.destructiveFlushLock.acquire();
    }

    endDestructiveFlush(): void {
        this.destructiveFlushLock.release();
    }

    exportContent(): Promise<string> {
        return this.surface.exportDocument();
    }

    private serializedImport(content: string | undefined, documentRevision: number): Promise<void> {
        return this.serializedModelerOperation(() =>
            this.loadHostDocument(content, documentRevision),
        );
    }

    private async loadHostDocument(
        content: string | undefined,
        documentRevision: number,
    ): Promise<void> {
        await this.surface.importHostDocument(content);
        this.revisions.markImported(documentRevision);
    }

    private async flushPendingHostUpdates(): Promise<void> {
        while (this.debouncedHostUpdate.pending()) {
            try {
                await this.debouncedHostUpdate.flush();
            } catch (error) {
                this.reportHostImportError(error);
            }
        }
    }

    private async runPendingActions(): Promise<void> {
        while (!this.engineReloadPending) {
            await this.flushPendingHostUpdates();
            if (this.engineReloadPending) return;

            if (this.refreshDiagramWhenReady) {
                this.refreshDiagramWhenReady = false;
                try {
                    await this.serializedModelerOperation(() => this.surface.refreshDiagram());
                } catch (error) {
                    const cause = error instanceof Error ? error : new Error(String(error));
                    this.host.postMessage(
                        new LogErrorCommand(
                            `Unable to refresh diagram\n${cause.message}`,
                            cause.stack,
                        ),
                    );
                }
                if (this.engineReloadPending) return;
                continue;
            }

            if (this.debouncedHostUpdate.pending()) {
                continue;
            }

            if (this.pendingFocusId !== undefined) {
                this.surface.centerOnElement(this.pendingFocusId);
                this.pendingFocusId = undefined;
            }
            return;
        }
    }

    private async sendChanges(): Promise<void> {
        // diagram-js discards the returned promise, so an uncaught rejection
        // would only reach the global hook as a context-free line.
        try {
            const versionAtExport = this.revisions.version;
            const content = await this.surface.exportDocument();
            if (!this.revisions.isCurrent(versionAtExport) || this.debouncedHostUpdate.pending()) {
                return;
            }
            this.host.postMessage(
                new SyncDocumentCommand(content, this.revisions.representedRevision),
            );
            this.surface.afterSync();
        } catch (error) {
            const e = error instanceof Error ? error : new Error(String(error));
            this.host.postMessage(
                new LogErrorCommand(`Failed to sync diagram changes: ${e.message}`, e.stack),
            );
        }
    }

    private reportHostImportError(error: unknown): void {
        const cause = error instanceof Error ? error : new Error(String(error));
        this.host.postMessage(
            new LogErrorCommand(`Unable to open host XML\n${cause.message}`, cause.stack),
        );
    }
}
