import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";

import { ensureGlobalWebCrypto } from "./webCryptoCompatibility";

describe("ensureGlobalWebCrypto", () => {
    it("installs Node's Web Crypto on a global scope that lacks one", () => {
        const globalScope: { crypto?: Crypto } = {};

        ensureGlobalWebCrypto(globalScope);

        expect(globalScope.crypto).toBe(webcrypto);
        expect(globalScope.crypto?.getRandomValues(new Uint8Array(16))).toHaveLength(16);
    });

    it("keeps a native global Web Crypto", () => {
        const nativeCrypto = {} as Crypto;
        const globalScope = { crypto: nativeCrypto };

        ensureGlobalWebCrypto(globalScope);

        expect(globalScope.crypto).toBe(nativeCrypto);
    });
});
