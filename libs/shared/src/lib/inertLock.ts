/**
 * Blocks user interaction on a target while a session holds the lock, and
 * restores whatever `inert` state the target had before the first acquire.
 */
export interface InertLock {
    acquire(): void;
    release(): void;
    /** Forgets the saved state so the target stays locked for a new owner, e.g. an engine reload. */
    abandon(): void;
}

export function createInertLock(target: Pick<HTMLElement, "inert">): InertLock {
    let inertBeforeLock: boolean | undefined;

    return {
        acquire(): void {
            if (inertBeforeLock !== undefined) return;
            inertBeforeLock = Boolean(target.inert);
            target.inert = true;
        },
        release(): void {
            if (inertBeforeLock === undefined) return;
            target.inert = inertBeforeLock;
            inertBeforeLock = undefined;
        },
        abandon(): void {
            inertBeforeLock = undefined;
        },
    };
}
