import { defineConfig } from "vitest/config";

import { coveragePreset, workspaceAliases } from "../../vitest.shared";

export default defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
        name: "shared",
        environment: "node",
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        coverage: {
            ...coveragePreset(__dirname),
            thresholds: { statements: 39, branches: 64, functions: 28, lines: 38 },
        },
    },
});
