const NONCE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const NONCE_LENGTH = 32;
// Bytes at or above this bound would map to the alphabet's start more often than to its end.
const UNBIASED_BYTE_LIMIT = 256 - (256 % NONCE_ALPHABET.length);

export function getNonce(): string {
    const randomBytes = new Uint8Array(NONCE_LENGTH * 2);
    let nonce = "";
    while (nonce.length < NONCE_LENGTH) {
        globalThis.crypto.getRandomValues(randomBytes);
        for (const randomByte of randomBytes) {
            if (randomByte < UNBIASED_BYTE_LIMIT && nonce.length < NONCE_LENGTH) {
                nonce += NONCE_ALPHABET[randomByte % NONCE_ALPHABET.length];
            }
        }
    }
    return nonce;
}
