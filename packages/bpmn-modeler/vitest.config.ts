import { defineConfig } from "vitest/config";

import { coveragePreset } from "../../vitest.shared";

// One run over both projects so the jsdom and Chromium coverage merge into a
// single report; separately, browser-only code would read as uncovered.
export default defineConfig({
    test: {
        projects: ["./vitest.unit.config.ts", "./vitest.browser.config.ts"],
        coverage: {
            ...coveragePreset(__dirname),
            thresholds: { statements: 84, branches: 76, functions: 79, lines: 84 },
        },
    },
});
