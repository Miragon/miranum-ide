import { describe, expect, it } from "vitest";

import { createInertLock } from "./inertLock";

describe("createInertLock", () => {
    it("locks an interactive target and unlocks it on release", () => {
        const target = { inert: false };
        const lock = createInertLock(target);

        lock.acquire();
        expect(target.inert).toBe(true);

        lock.release();
        expect(target.inert).toBe(false);
    });

    it("keeps a target that was already inert locked after the release", () => {
        const target = { inert: true };
        const lock = createInertLock(target);

        lock.acquire();
        lock.release();

        expect(target.inert).toBe(true);
    });

    it("restores the state from before the first acquire when acquired twice", () => {
        const target = { inert: false };
        const lock = createInertLock(target);

        lock.acquire();
        lock.acquire();
        lock.release();

        expect(target.inert).toBe(false);
    });

    it("leaves the target alone when released without being acquired", () => {
        const lockedTarget = { inert: true };
        const freeTarget = { inert: false };

        createInertLock(lockedTarget).release();
        createInertLock(freeTarget).release();

        expect(lockedTarget.inert).toBe(true);
        expect(freeTarget.inert).toBe(false);
    });

    it("leaves the target locked when abandoned, even through a later release", () => {
        const target = { inert: false };
        const lock = createInertLock(target);
        lock.acquire();

        lock.abandon();
        lock.release();

        expect(target.inert).toBe(true);
    });

    it("can be acquired afresh after being abandoned", () => {
        const target = { inert: false };
        const lock = createInertLock(target);
        lock.acquire();
        lock.abandon();
        target.inert = false;

        lock.acquire();
        expect(target.inert).toBe(true);

        lock.release();
        expect(target.inert).toBe(false);
    });
});
