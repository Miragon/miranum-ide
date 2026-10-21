import { defineConfig } from "vitest/config";

import { coveragePreset, workspaceAliases } from "../../vitest.shared";

export default defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
        name: "bpmn-i18n-extras",
        environment: "node",
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        coverage: {
            ...coveragePreset(__dirname),
            thresholds: { statements: 97, branches: 97, functions: 97, lines: 97 },
        },
    },
});
