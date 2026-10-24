import type { ImportXMLResult } from "bpmn-js/lib/BaseViewer";

import {
    type BpmnFileQuery,
    createFlushResponder,
    createResolver,
    type FlushSource,
    HostDocumentRevisions,
    type InertLock,
    LogErrorCommand,
    LogWarningCommand,
    SyncDocumentCommand,
} from "@miragon/bpmn-modeler-shared";
import {
    asyncDebounce,
    type DetectedEngine,
    formatErrors,
    serializeAsync,
} from "@miragon/bpmn-modeler-types";

import type { WebviewStateManager } from "../state";
import { isEditableHandle, isModelerHandle, type SurfaceHandle } from "../surface";
import type { HostChannel } from "./hostChannel";

type ViewStateKeeper = Pick<WebviewStateManager, "captureViewState" | "applyViewState">;

export interface HostDocumentFollowUps {
    reloadForEngineChange(): Promise<void>;
    drainPendingActions(): Promise<void>;
}

export interface DocumentSyncPorts {
    /** `undefined` until the surface is bound after its first import. */
    getViewState(): ViewStateKeeper | undefined;
    flushLock: InertLock;
    followUps: HostDocumentFollowUps;
}

export class BpmnDocumentSync implements FlushSource {
    private readonly revisions = new HostDocumentRevisions();
    private readonly initialHostFile = createResolver<BpmnFileQuery>();
    private latestHostFile: BpmnFileQuery | undefined;
    private documentEngine: DetectedEngine;
    private canImportHostUpdates = false;
    private ready = false;

    private readonly modelerOperations = serializeAsync(
        async (operation: () => Promise<void>): Promise<void> => operation(),
    );
    private readonly debouncedHostUpdate = asyncDebounce(
        (bpmn: string | undefined, documentRevision: number) =>
            this.openHostXmlInQueue(bpmn, documentRevision),
        100,
    );
    /**
     * Debounces the outbound document sync so a burst of model changes (e.g.
     * properties-panel typing) collapses into one full export + host write
     * instead of one per keystroke. `maxWait` bounds starvation: sustained
     * typing still syncs at least once per second. 300ms/1000ms mirrors the
     * script-streaming debounce. The host recovers the sub-300ms tail via the
     * flush protocol ({@link respondToFlush}) so a save never persists stale XML.
     */
    private readonly outboundSync = asyncDebounce(() => this.sendXmlChanges(), 300, {
        maxWait: 1000,
    });

    readonly respondToFlush = createFlushResponder(this, (reply) => this.host.postMessage(reply));

    constructor(
        private readonly host: HostChannel,
        private readonly getSurface: () => SurfaceHandle,
        private readonly ports: DocumentSyncPorts,
    ) {}

    waitForInitialFile(): Promise<BpmnFileQuery | undefined> {
        return this.initialHostFile.wait();
    }

    async receiveHostFile(query: BpmnFileQuery): Promise<void> {
        const documentRevision = query.documentRevision ?? 0;
        const receipt = this.revisions.receive(documentRevision);

        if (receipt === "stale") return;

        this.latestHostFile = query;

        if (receipt === "initial") {
            this.initialHostFile.done(query);
            return;
        }

        // A host push (e.g. a raw-XML side-by-side edit) is authoritative. Drop
        // any pending outbound sync first so a stale export firing after the
        // re-import can't clobber it.
        this.outboundSync.cancel();
        if (!this.canImportHostUpdates) return;
        if (query.engine !== this.documentEngine) {
            await this.ports.followUps.reloadForEngineChange();
            return;
        }
        try {
            await this.debouncedHostUpdate(query.content, documentRevision);
        } finally {
            if (this.ready) {
                await this.ports.followUps.drainPendingActions();
            }
        }
    }

    /** Resolves `false` when the session cannot go on: nothing opened, or the engine changed. */
    async importInitial(initialFile: BpmnFileQuery | undefined): Promise<boolean> {
        this.documentEngine = initialFile?.engine;
        let importedFile = this.latestHostFile ?? initialFile;
        while (importedFile) {
            if (importedFile.engine !== this.documentEngine) {
                await this.ports.followUps.reloadForEngineChange();
                return false;
            }
            try {
                await this.openHostXmlInQueue(importedFile.content, importedFile.documentRevision);
                break;
            } catch (error) {
                if (this.latestHostFile && this.latestHostFile !== importedFile) {
                    this.reportHostImportError(error);
                    importedFile = this.latestHostFile;
                    continue;
                }
                const message = error instanceof Error ? error.message : String(error);
                this.host.postMessage(new LogErrorCommand(`Unable to open XML\n${message}`));
                return false;
            }
        }

        this.canImportHostUpdates = true;

        const queuedFile = this.latestHostFile;
        if (queuedFile && queuedFile !== importedFile) {
            if (queuedFile.engine !== this.documentEngine) {
                await this.ports.followUps.reloadForEngineChange();
                return false;
            }
            try {
                await this.debouncedHostUpdate(queuedFile.content, queuedFile.documentRevision);
            } catch (error) {
                this.reportHostImportError(error);
            }
        }
        await this.flushHostUpdates();
        return true;
    }

    markReady(): void {
        this.ready = true;
    }

    scheduleSync(): void {
        void this.outboundSync();
    }

    /** Best effort: fires the scheduled sync now and waits for the one in flight. */
    flushOutbound(): Promise<void> {
        return this.outboundSync.flush();
    }

    async flushBeforeSurfaceDestroy(): Promise<void> {
        await this.flushPendingSync();
        this.outboundSync.cancel();
    }

    async flushHostUpdates(): Promise<void> {
        while (this.debouncedHostUpdate.pending()) {
            try {
                await this.debouncedHostUpdate.flush();
            } catch (error) {
                this.reportHostImportError(error);
            }
        }
    }

    /** Imports, refreshes, mode switches and the reload teardown never interleave. */
    enqueueModelerOperation(operation: () => Promise<void>): Promise<void> {
        return this.modelerOperations(operation);
    }

    cancelAll(): void {
        this.ready = false;
        this.canImportHostUpdates = false;
        this.outboundSync.cancel();
        this.debouncedHostUpdate.cancel();
    }

    isReady(): boolean {
        return this.ready;
    }

    hasPendingSync(): boolean {
        return this.outboundSync.pending();
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

    async flushPendingSync(): Promise<void> {
        while (this.outboundSync.pending()) {
            await this.outboundSync.flush();
        }
    }

    beginDestructiveFlush(): void {
        this.ports.flushLock.acquire();
    }

    endDestructiveFlush(): void {
        this.ports.flushLock.release();
    }

    exportContent(): Promise<string> {
        return this.getSurface().exportDiagram();
    }

    private openHostXmlInQueue(bpmn: string | undefined, documentRevision: number): Promise<void> {
        return this.modelerOperations(() => this.reimportPreservingView(bpmn, documentRevision));
    }

    // The snapshot is taken inside the debounced import so a burst of host
    // pushes captures once, not from a half-imported intermediate.
    private async reimportPreservingView(
        bpmn: string | undefined,
        documentRevision: number,
    ): Promise<void> {
        const snapshot = this.ports.getViewState()?.captureViewState();
        try {
            await this.openHostXml(bpmn, documentRevision);
        } finally {
            // Re-apply even when a post-import side-effect threw — the import
            // itself already reset the canvas to the top-level plane, and
            // skipping the restore would strand the user there.
            if (snapshot) {
                this.ports.getViewState()?.applyViewState(snapshot);
            }
        }
    }

    private async openHostXml(bpmn: string | undefined, documentRevision: number): Promise<void> {
        await this.openXml(bpmn);
        this.revisions.markImported(documentRevision);
    }

    private async openXml(bpmn: string | undefined): Promise<void> {
        const surface = this.getSurface();
        let result: ImportXMLResult;
        // Only an editable surface can create a blank diagram; the readonly
        // viewer always loads the host XML (a diff/View pane never opens blank).
        if (!bpmn && isEditableHandle(surface)) {
            result = await surface.newDiagram();
        } else {
            result = await surface.loadDiagram(bpmn ?? "");
        }

        if (result.warnings.length > 0) {
            const warnings = `Diagram opened with following warnings: ${formatErrors(result.warnings)}`;
            this.host.postMessage(new LogWarningCommand(warnings));
        }
    }

    /**
     * Align-to-origin runs at debounce-fire time too (and is skipped on the
     * flush path, which only exports); the next edit realigns. That align emits
     * its own `commandStack.changed`, which schedules one more debounced cycle —
     * but a no-op align executes no commands, so the cycle terminates rather
     * than looping.
     */
    private async sendXmlChanges(): Promise<void> {
        // A rejection here only reaches the global unhandledrejection hook
        // (diagram-js discards the returned promise) as a context-free line —
        // catch it so the failure is named and deterministic on the channel.
        try {
            const versionAtExport = this.revisions.version;
            const bpmn = await this.getSurface().exportDiagram();

            if (!this.revisions.isCurrent(versionAtExport) || this.debouncedHostUpdate.pending()) {
                return;
            }

            this.host.postMessage(
                new SyncDocumentCommand(bpmn, this.revisions.representedRevision),
            );
            // Align-to-origin is a modeler-only feature; the designer/viewer skip it.
            const surface = this.getSurface();
            if (isModelerHandle(surface)) {
                surface.alignElementsToOrigin();
            }
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
