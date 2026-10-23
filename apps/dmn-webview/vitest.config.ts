import { defineConfig } from "vitest/config";

import { coveragePreset, workspaceAliases } from "../../vitest.shared";

export default defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
        name: "dmn-webview",
        environment: "jsdom",
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        coverage: {
            // Import-time entry wiring; bootstrap.ts carries the logic.
            ...coveragePreset(__dirname, { exclude: ["src/main.ts"] }),
            thresholds: { statements: 76, branches: 57, functions: 80, lines: 77 },
        },
    },
});
