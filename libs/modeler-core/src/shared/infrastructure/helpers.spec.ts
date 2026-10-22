import { describe, expect, it } from "vitest";

import { getNonce } from "./helpers";

describe("getNonce", () => {
    it("is 32 alphanumeric characters, safe to embed in a CSP nonce-source", () => {
        expect(getNonce()).toMatch(/^[A-Za-z0-9]{32}$/);
    });

    it("differs between calls", () => {
        const nonces = new Set(Array.from({ length: 20 }, () => getNonce()));

        expect(nonces.size).toBe(20);
    });
});
