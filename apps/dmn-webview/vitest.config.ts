import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "dmn-webview",
        environment: "jsdom",
        include: ["src/**/*.{spec,test}.ts"],
        alias: {
            "@miragon/bpmn-modeler-shared": resolve(__dirname, "../../libs/shared/src/index.ts"),
            "@miragon/bpmn-modeler-types": resolve(
                __dirname,
                "../../libs/modeler-types/src/index.ts",
            ),
            "@miragon/dmn-modeler": resolve(__dirname, "../../packages/dmn-modeler/src/index.ts"),
        },
        coverage: {
            provider: "v8",
            reportsDirectory: "../../coverage/apps/dmn-webview",
            reporter: ["text", "html", "lcov", "clover", "json", "json-summary"],
            // Without an explicit include only files a test imports are measured,
            // so a new untested module would not lower the percentage.
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts", "src/**/__fixtures__/**"],
            // ~3 pts below the measured baseline so minor churn does not break CI.
            thresholds: { statements: 66, branches: 43, functions: 72, lines: 68 },
        },
    },
});
