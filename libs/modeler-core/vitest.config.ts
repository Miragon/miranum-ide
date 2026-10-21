import { defineConfig } from "vitest/config";

import { coveragePreset, workspaceAliases } from "../../vitest.shared";

// Kept apart so the PR coverage action, which regex-reads the first unquoted
// `statements:` in this file, reports the global gate rather than a glob tier.
const overallThresholds = { statements: 89, branches: 81, functions: 89, lines: 90 };

export default defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
        name: "modeler-core",
        environment: "node",
        globals: true,
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        server: { deps: { inline: [/@miragon\/bpmnlint-plugin-rules/] } },
        coverage: {
            // Re-export barrel; no spec imports it.
            ...coveragePreset(__dirname, { exclude: ["src/index.ts"] }),
            thresholds: {
                ...overallThresholds,
                "**/domain/**": { statements: 94, branches: 90, functions: 96, lines: 94 },
                "**/service/**": { statements: 87, branches: 76, functions: 87, lines: 88 },
                "**/infrastructure/**": { statements: 89, branches: 83, functions: 85, lines: 90 },
            },
        },
    },
});
