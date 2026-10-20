import { defineConfig } from "vitest/config";

// One run over both projects so the jsdom and Chromium coverage merge into a
// single report; separately, browser-only code would read as uncovered.
export default defineConfig({
    test: {
        projects: ["./vitest.unit.config.ts", "./vitest.browser.config.ts"],
        coverage: {
            provider: "v8",
            reportsDirectory: "../../coverage/packages/bpmn-modeler",
            reporter: ["text", "html", "lcov", "clover", "json", "json-summary"],
            // Without an explicit include only files a test imports are measured,
            // so a new untested module would not lower the percentage.
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts", "src/**/__fixtures__/**"],
            // ~3 pts below the measured baseline so minor churn does not break CI.
            thresholds: { statements: 84, branches: 76, functions: 79, lines: 84 },
        },
    },
});
