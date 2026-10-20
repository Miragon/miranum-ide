import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
    test: {
        name: "dmn-modeler",
        environment: "jsdom",
        include: ["src/**/*.{spec,test}.ts"],
        alias: {
            "@miragon/bpmn-modeler-types": resolve(
                __dirname,
                "../../libs/modeler-types/src/index.ts",
            ),
            // The i18n overlay lib has no package entry point; createModeler
            // value-imports it, so specs that load it need the path mapped
            // explicitly (the lib build uses tsconfig paths).
            "@miragon/bpmn-modeler-i18n-extras": resolve(
                __dirname,
                "../../libs/bpmn-i18n-extras/src/index.ts",
            ),
        },
        coverage: {
            provider: "v8",
            reportsDirectory: "../../coverage/packages/dmn-modeler",
            reporter: ["text", "html", "lcov", "clover", "json", "json-summary"],
            // Without an explicit include only files a test imports are measured,
            // so a new untested module would not lower the percentage.
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts", "src/**/__fixtures__/**"],
            // ~3 pts below the measured baseline so minor churn does not break CI.
            thresholds: { statements: 89, branches: 79, functions: 83, lines: 90 },
        },
    },
});
