import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "form-webview",
        environment: "jsdom",
        include: ["src/**/*.{spec,test}.ts"],
        alias: {
            "@miragon/bpmn-modeler-shared": resolve(__dirname, "../../libs/shared/src/index.ts"),
            // The shared barrel reaches `@miragon/bpmn-modeler-types`, which has no
            // runtime package entry (source-only), so map it explicitly like the
            // other webviews do.
            "@miragon/bpmn-modeler-types": resolve(
                __dirname,
                "../../libs/modeler-types/src/index.ts",
            ),
        },
        coverage: {
            provider: "v8",
            reportsDirectory: "../../coverage/apps/form-webview",
            reporter: ["text", "html", "lcov", "clover", "json", "json-summary"],
            // Without an explicit include only files a test imports are measured,
            // so a new untested module would not lower the percentage.
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts", "src/**/__fixtures__/**"],
            // ~3 pts below the measured baseline so minor churn does not break CI.
            thresholds: { statements: 80, branches: 67, functions: 72, lines: 82 },
        },
    },
});
