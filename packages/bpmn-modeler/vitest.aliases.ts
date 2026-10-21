import { resolve } from "node:path";
import type { Alias } from "vite";

import { workspaceAliases } from "../../vitest.shared";

export const bpmnModelerTestAliases: Alias[] = [
    // The minimap's CJS build wraps diagram-js's ESM `IdGenerator` in an
    // interop that leaves it non-constructible under Vitest's runner; the
    // ESM build imports it natively, so specs standing up a real viewer
    // resolve that one instead (the lib build already picks `module` over `main`).
    {
        find: /^diagram-js-minimap$/,
        replacement: resolve(__dirname, "../../node_modules/diagram-js-minimap/dist/index.esm.js"),
    },
    ...workspaceAliases,
];
