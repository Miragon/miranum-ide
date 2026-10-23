import { webcrypto } from "node:crypto";

/** Installs the global Web Crypto that extension hosts before VS Code 1.90 (Node < 19) lack. */
export function ensureGlobalWebCrypto(globalScope: { crypto?: unknown } = globalThis): void {
    if (globalScope.crypto !== undefined) return;

    Object.defineProperty(globalScope, "crypto", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: webcrypto,
    });
}
