import { defineConfig } from "vitest/config";

import { coveragePreset, workspaceAliases } from "../../vitest.shared";

export default defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
        name: "bpmn-webview",
        environment: "jsdom",
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        // The rules plugin ships pure ESM with a subpath `exports` map Vitest's
        // default externalisation mishandles; inline it so the in-page linter
        // specs import it the same way the bundle does (mirrors modeler-core).
        server: { deps: { inline: [/@miragon\/bpmnlint-plugin-rules/] } },
        coverage: {
            ...coveragePreset(__dirname),
            thresholds: { statements: 49, branches: 40, functions: 48, lines: 50 },
        },
    },
});
