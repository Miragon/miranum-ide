import { defineConfig } from "vitest/config";

import { coveragePreset, workspaceAliases } from "../../vitest.shared";

// Kept apart so the PR coverage action, which regex-reads the first unquoted
// `statements:` in this file, reports the global gate rather than a glob tier.
const overallThresholds = { statements: 70, branches: 64, functions: 62, lines: 71 };

export default defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
        name: "vscode-plugin",
        environment: "node",
        // archunit's vitest adapter extends `expect` on import; it needs the
        // global `expect` to exist, so enable Vitest's globals for this project.
        globals: true,
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        // `@miragon/bpmnlint-plugin-rules`' pre-built ESM has one extensionless deep
        // import (`bpmnlint/lib/resolver/static-resolver`) that strict native
        // Node ESM rejects; inline it through Vite's resolver (as webpack/Bun do).
        server: { deps: { inline: [/@miragon\/bpmnlint-plugin-rules/] } },
        coverage: {
            ...coveragePreset(__dirname, {
                // Wiring only; the Extension-Host smoke test (test/e2e) covers it,
                // and feature barrels are re-exports enforced by architecture.spec.
                exclude: ["src/composition/**", "src/**/index.ts"],
            }),
            // Per-layer gates, tiered by how much logic each layer carries and
            // how cheaply it can be tested. Controllers mix routing with vscode
            // glue; infrastructure is thin adapter code where only a floor is
            // worth enforcing (the complex parts — Camunda REST — have their own
            // integration tests).
            thresholds: {
                ...overallThresholds,
                "**/controller/**": { statements: 84, branches: 78, functions: 79, lines: 86 },
                "**/editor-session/**": { statements: 76, branches: 65, functions: 78, lines: 83 },
                "**/infrastructure/**": { statements: 43, branches: 42, functions: 34, lines: 43 },
            },
        },
    },
});
