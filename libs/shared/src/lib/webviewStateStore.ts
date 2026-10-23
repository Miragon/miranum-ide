import type { HostApi } from "./host";

export type WebviewStateHost<T> = Pick<HostApi<T, unknown>, "getState" | "setState" | "updateState">;

/**
 * Persisted webview state where "nothing saved yet" is a normal value rather
 * than the {@link MissingStateError} the host API throws on a first-ever open.
 */
export interface WebviewStateStore<T> {
    read(): T | undefined;
    merge(partial: Partial<T>): void;
}

export function createWebviewStateStore<T>(host: WebviewStateHost<T>): WebviewStateStore<T> {
    return {
        read() {
            try {
                return host.getState();
            } catch {
                return undefined;
            }
        },
        merge(partial) {
            try {
                host.updateState(partial);
            } catch {
                // `updateState` reads before it writes, so the first-ever write seeds the state.
                host.setState(partial as T);
            }
        },
    };
}
