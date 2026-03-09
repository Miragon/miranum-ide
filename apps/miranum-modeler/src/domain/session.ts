/**
 * Domain entity representing a per-editor modeler session.
 *
 * Tracks an echo-prevention guard counter to break infinite sync loops:
 * when the extension writes to the document in response to a webview
 * SyncDocumentCommand, the resulting onDidChangeTextDocument event must not
 * cause the document to be re-sent to the webview.
 */
export class ModelerSession {
    /** The document URI path, used as the unique session identifier. */
    readonly id: string;

    /**
     * Guard counter: greater than zero means a webview-initiated write is in
     * progress.  A counter (rather than a boolean) is safe under overlapping
     * async calls.
     */
    private guardCount = 0;

    /**
     * Creates a new session for the given editor.
     * @param id Document URI path (editorId).
     */
    constructor(id: string) {
        this.id = id;
    }

    /**
     * Increments the guard counter before a webview-initiated document write.
     * Must be paired with a corresponding {@link releaseGuard} call.
     */
    acquireGuard(): void {
        this.guardCount++;
    }

    /**
     * Decrements the guard counter after the write completes.
     * Safe to call even when the counter is already zero.
     */
    releaseGuard(): void {
        if (this.guardCount > 0) {
            this.guardCount--;
        }
    }

    /**
     * Returns `true` while a webview-initiated write is in progress.
     * Used by display use cases to skip re-sending the document to the webview.
     */
    isGuarded(): boolean {
        return this.guardCount > 0;
    }
}
