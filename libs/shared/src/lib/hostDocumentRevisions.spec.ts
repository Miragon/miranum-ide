import { describe, expect, it } from "vitest";

import { HostDocumentRevisions } from "./hostDocumentRevisions";

describe("HostDocumentRevisions", () => {
    describe("receive", () => {
        it("classifies the first document as initial, whatever its revision", () => {
            const revisions = new HostDocumentRevisions();

            expect(revisions.receive(7)).toBe("initial");
        });

        it("classifies a later document at the same or a newer revision as an update", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(3);

            expect(revisions.receive(3)).toBe("update");
            expect(revisions.receive(4)).toBe("update");
        });

        it("classifies a document older than the latest received as stale", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(7);

            expect(revisions.receive(6)).toBe("stale");
        });

        it("keeps a stale document from lowering the bar for the next one", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(7);
            revisions.receive(2);

            expect(revisions.receive(5)).toBe("stale");
        });

        it("still treats the first document after a stale one as an update", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(7);
            revisions.receive(2);

            expect(revisions.receive(8)).toBe("update");
        });
    });

    describe("version", () => {
        it("starts at zero and counts every accepted document", () => {
            const revisions = new HostDocumentRevisions();
            expect(revisions.version).toBe(0);

            revisions.receive(1);
            revisions.receive(2);

            expect(revisions.version).toBe(2);
        });

        it("does not count a stale document", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(4);

            revisions.receive(1);

            expect(revisions.version).toBe(1);
        });
    });

    describe("isCurrent", () => {
        it("holds for a snapshot while no newer document arrived", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(1);
            const snapshot = revisions.version;

            expect(revisions.isCurrent(snapshot)).toBe(true);
        });

        it("goes stale once another document is accepted", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(1);
            const snapshot = revisions.version;

            revisions.receive(2);

            expect(revisions.isCurrent(snapshot)).toBe(false);
        });

        it("survives a stale document", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(4);
            const snapshot = revisions.version;

            revisions.receive(1);

            expect(revisions.isCurrent(snapshot)).toBe(true);
        });
    });

    describe("representedRevision", () => {
        it("stays at zero until a document is imported", () => {
            const revisions = new HostDocumentRevisions();

            revisions.receive(5);

            expect(revisions.representedRevision).toBe(0);
        });

        it("follows the import of the latest document", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(5);

            revisions.markImported(5);

            expect(revisions.representedRevision).toBe(5);
        });

        it("ignores the import of a document a newer one has overtaken", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(5);
            revisions.markImported(5);
            revisions.receive(6);

            revisions.receive(7);
            revisions.markImported(6);

            expect(revisions.representedRevision).toBe(5);
        });

        it("accepts the import once the overtaking document lands", () => {
            const revisions = new HostDocumentRevisions();
            revisions.receive(6);
            revisions.receive(7);
            revisions.markImported(6);

            revisions.markImported(7);

            expect(revisions.representedRevision).toBe(7);
        });
    });
});
