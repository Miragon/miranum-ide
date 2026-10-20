import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "bpmn-i18n-extras",
        environment: "node",
        include: ["src/**/*.{spec,test}.ts"],
        coverage: {
            provider: "v8",
            reportsDirectory: "../../coverage/libs/bpmn-i18n-extras",
            reporter: ["text", "html", "lcov", "clover", "json", "json-summary"],
            // Without an explicit include only files a test imports are measured,
            // so a new untested module would not lower the percentage.
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts", "src/**/__fixtures__/**"],
            // ~3 pts below the measured baseline so minor churn does not break CI.
            thresholds: { statements: 97, branches: 97, functions: 97, lines: 97 },
        },
    },
});
