import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
    // The panel package has no `jsx-dev-runtime`; force the production runtime
    // so the `@jsxImportSource @bpmn-io/properties-panel/preact` pragma resolves.
    oxc: { jsx: { development: false } },
    test: {
        name: "definition-search",
        environment: "jsdom",
        include: ["src/**/*.{spec,test}.{ts,tsx}"],
        alias: {
            "@miragon/bpmn-modeler-types": resolve(
                __dirname,
                "../../libs/modeler-types/src/index.ts",
            ),
        },
    },
});
