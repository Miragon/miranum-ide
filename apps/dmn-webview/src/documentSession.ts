import {
    type Command,
    createFlushResponder,
    createInertLock,
    createResolver,
    type DmnFileQuery,
    type FlushSource,
    type HostApi,
    HostDocumentRevisions,
    LogErrorCommand,
    type Query,
    SyncDocumentCommand,
} from "@miragon/bpmn-modeler-shared";
import { asyncDebounce, NoModelerError, serializeAsync } from "@miragon/bpmn-modeler-types";
import type { DmnModelerHandle } from "@miragon/dmn-modeler";

import type { WebviewState } from "./webviewState";

type DmnHost = Pick<HostApi<WebviewState, Command | Query>, "postMessage">;

/**
 * The document side of one DMN webview session: the modeler that renders the
 * host document, the debounced host imports and outbound syncs, the host
 * revisions, and the destructive-flush lock.
 */
export class DmnDocumentSession implements FlushSource {
    private attachedModeler: DmnModelerHandle | undefined;
    private initialDocumentImported = false;
    private disposed = false;
    private readonly revisions = new HostDocumentRevisions();
    private readonly flushLock = createInertLock(document.body);
    private readonly initialHostFile = createResolver<DmnFileQuery>();
    private readonly importHostDocument = serializeAsync(
        (content: string | undefined, documentRevision: number): Promise<void> =>
            this.loadHostDocument(content, documentRevision),
    );
    private readonly debouncedHostUpdate = asyncDebounce(this.importHostDocument, 100);
    // Sustained decision-table typing still syncs once per `maxWait`; the host
    // recovers the sub-300ms tail through the flush protocol.
    private readonly debouncedSync = asyncDebounce(() => this.sendChanges(), 300, {
        maxWait: 1000,
    });

    readonly respondToFlush = createFlushResponder(this, (reply) => this.post(reply));

    constructor(private readonly host: DmnHost) {}

    get modeler(): DmnModelerHandle | undefined {
        return this.attachedModeler;
    }

    requireModeler(): DmnModelerHandle {
        if (!this.attachedModeler) {
            throw new NoModelerError();
        }
        return this.attachedModeler;
    }

    attachModeler(modeler: DmnModelerHandle): void {
        this.attachedModeler = modeler;
    }

    async openInitialDocument(): Promise<void> {
        const initialFile = await this.initialHostFile.wait();
        try {
            await this.importHostDocument(initialFile?.content, initialFile?.documentRevision ?? 0);
        } catch (error) {
            const message = error instanceof Error ? error.message : `${error}`;
            this.post(new LogErrorCommand(`Unable to open XML ${message}`));
        }
        await this.flushPendingHostUpdates();
        this.initialDocumentImported = true;
    }

    async receiveHostFile(query: DmnFileQuery): Promise<void> {
        const documentRevision = query.documentRevision ?? 0;
        switch (this.revisions.receive(documentRevision)) {
            case "initial":
                this.initialHostFile.done(query);
                return;
            case "update":
                // A host push is authoritative; drop any pending outbound sync so a
                // stale export can't clobber it after re-import.
                this.debouncedSync.cancel();
                try {
                    await this.debouncedHostUpdate(query.content, documentRevision);
                } catch (error) {
                    const message = error instanceof Error ? error.message : `${error}`;
                    this.post(
                        new LogErrorCommand(
                            `Something went wrong when receiving the message ${message}`,
                        ),
                    );
                }
                return;
            case "stale":
                return;
        }
    }

    scheduleSync(): void {
        void this.debouncedSync();
    }

    async flushPendingSync(): Promise<void> {
        while (this.debouncedSync.pending()) {
            await this.debouncedSync.flush();
        }
    }

    async applyLanguage(locale: string): Promise<void> {
        try {
            // The handle compares resolved locales itself, so a re-push on a
            // tab re-show is a no-op and never re-opens the view.
            await this.requireModeler().setLocale(locale);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.post(new LogErrorCommand(`Failed to set language: ${detail}`));
        }
    }

    focusCanvas(): void {
        this.requireModeler().focusCanvas();
    }

    isReady(): boolean {
        return this.initialDocumentImported;
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
        this.flushLock.acquire();
    }

    endDestructiveFlush(): void {
        this.flushLock.release();
    }

    exportContent(): Promise<string> {
        return this.requireModeler().exportDiagram();
    }

    dispose(): void {
        this.disposed = true;
        this.debouncedSync.cancel();
        this.debouncedHostUpdate.cancel();
        this.flushLock.release();
        this.attachedModeler?.destroy();
        this.attachedModeler = undefined;
    }

    private async loadHostDocument(
        content: string | undefined,
        documentRevision: number,
    ): Promise<void> {
        if (content) {
            await this.requireModeler().loadDiagram(content);
        }
        this.revisions.markImported(documentRevision);
    }

    private async flushPendingHostUpdates(): Promise<void> {
        while (this.debouncedHostUpdate.pending()) {
            try {
                await this.debouncedHostUpdate.flush();
            } catch {
                // receiveHostFile reports the import error; keep draining so a
                // later valid host update can still complete the initial import.
            }
        }
    }

    private async sendChanges(): Promise<void> {
        // A rejection here only reaches the global unhandledrejection hook (the
        // dmn-js event bus discards the returned promise) as a context-free line —
        // catch it so the failure is named and deterministic on the channel.
        try {
            const versionAtExport = this.revisions.version;
            const content = await this.requireModeler().exportDiagram();
            if (!this.revisions.isCurrent(versionAtExport) || this.debouncedHostUpdate.pending()) {
                return;
            }
            this.post(new SyncDocumentCommand(content, this.revisions.representedRevision));
        } catch (error) {
            const e = error instanceof Error ? error : new Error(String(error));
            this.post(new LogErrorCommand(`Failed to sync diagram changes: ${e.message}`, e.stack));
        }
    }

    private post(message: Command | Query): void {
        if (!this.disposed) {
            this.host.postMessage(message);
        }
    }
}
