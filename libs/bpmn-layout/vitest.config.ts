import { defineConfig } from "vitest/config";

import { coveragePreset, workspaceAliases } from "../../vitest.shared";

export default defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
        name: "bpmn-layout",
        // Node environment (no jsdom): the pure layers touch no DOM, and the
        // engine adapter runs on bpmn-moddle, which is Node-safe. Nothing here
        // needs a rendered diagram — bpmn-js is only ever met through fakes.
        environment: "node",
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        coverage: {
            ...coveragePreset(__dirname),
            thresholds: { statements: 92, branches: 81, functions: 96, lines: 95 },
        },
    },
});
