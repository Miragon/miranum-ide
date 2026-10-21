import { defineConfig } from "vitest/config";

import { coveragePreset, workspaceAliases } from "../../vitest.shared";

export default defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
        name: "flow-navigation",
        environment: "node",
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        coverage: {
            ...coveragePreset(__dirname),
            thresholds: { statements: 91, branches: 88, functions: 95, lines: 92 },
        },
    },
});
