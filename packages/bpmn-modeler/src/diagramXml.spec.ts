import { describe, expect, it, vi } from "vitest";

import { exportFormattedXml } from "./diagramXml";

describe("exportFormattedXml", () => {
    it("requests formatted XML and returns it", async () => {
        const saveXML = vi.fn().mockResolvedValue({ xml: "<x/>" });

        await expect(exportFormattedXml({ saveXML })).resolves.toBe("<x/>");
        expect(saveXML).toHaveBeenCalledWith({ format: true });
    });

    it("rethrows the exporter's rejection unchanged", async () => {
        const failure = new Error("no definitions loaded");
        const saveXML = vi.fn().mockRejectedValue(failure);

        await expect(exportFormattedXml({ saveXML })).rejects.toBe(failure);
    });
});
