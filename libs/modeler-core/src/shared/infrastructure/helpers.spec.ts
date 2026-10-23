import { afterEach, describe, expect, it, vi } from "vitest";

import { getNonce } from "./helpers";

afterEach(() => vi.restoreAllMocks());

function stubRandomBytes(nextByte: () => number) {
    return vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((array) => {
        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        bytes.forEach((_, index) => (bytes[index] = nextByte()));
        return array;
    });
}

describe("getNonce", () => {
    it("is 32 alphanumeric characters, safe to embed in a CSP nonce-source", () => {
        expect(getNonce()).toMatch(/^[A-Za-z0-9]{32}$/);
    });

    it("differs between calls", () => {
        const nonces = new Set(Array.from({ length: 20 }, () => getNonce()));

        expect(nonces.size).toBe(20);
    });

    it("draws its characters from crypto.getRandomValues, not Math.random", () => {
        const mathRandom = vi.spyOn(Math, "random");
        const getRandomValues = stubRandomBytes(() => 0);

        expect(getNonce()).toBe("A".repeat(32));
        expect(getRandomValues).toHaveBeenCalled();
        expect(mathRandom).not.toHaveBeenCalled();
    });

    it("maps the highest accepted byte to the last alphabet character", () => {
        stubRandomBytes(() => 247);

        expect(getNonce()).toBe("9".repeat(32));
    });

    it("discards bytes that would over-weight the start of the alphabet, drawing more as needed", () => {
        const biasedBytes = Array.from({ length: 200 }, (_, index) => 248 + (index % 8));
        let drawCount = 0;
        stubRandomBytes(() => biasedBytes[drawCount++] ?? 61);

        expect(getNonce()).toBe("9".repeat(32));
    });
});
