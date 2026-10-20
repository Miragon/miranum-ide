import { describe, expect, it } from "vitest";

import { applyTemplatePreset } from "./types";
import type { ElementTemplate } from "./types";

const template: ElementTemplate = {
    id: "rest",
    name: "REST",
    appliesTo: ["bpmn:ServiceTask"],
    properties: [
        { id: "method", type: "String", value: "GET", binding: { type: "zeebe:input" } },
        { id: "url", type: "String", binding: { type: "zeebe:input" } },
        {
            type: "Hidden",
            value: "io.camunda:http-json:1",
            binding: { type: "zeebe:taskDefinition" },
        },
    ],
    presets: [{ id: "post", properties: { method: "POST" } }],
};

describe("applyTemplatePreset", () => {
    it("overrides only the properties the preset names", () => {
        const applied = applyTemplatePreset(template, "post");

        expect(applied.properties.map((property) => property.value)).toEqual([
            "POST",
            undefined,
            "io.camunda:http-json:1",
        ]);
        expect(template.properties[0].value).toBe("GET");
    });

    it.each([
        ["no preset id", undefined],
        ["an unknown preset id", "missing"],
    ])("returns the template unchanged for %s", (_label, presetId) => {
        expect(applyTemplatePreset(template, presetId)).toBe(template);
    });
});
