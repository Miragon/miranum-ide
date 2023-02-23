/// <reference types="vitest" />
import { defineConfig } from "vite";

import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
    cacheDir: "../../node_modules/.vite/miranum-modeler-webview",

    plugins: [
        viteStaticCopy({
            targets: [
                { src: "../../node_modules/bpmn-js/dist/assets/bpmn-font/css/**", dest: "css/" },
                { src: "../../node_modules/bpmn-js/dist/assets/bpmn-font/font/**", dest: "font/" },
            ],
        }),
    ],

    build: {
        target: "es2021",
        commonjsOptions: { transformMixedEsModules: true },
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                // don"t hash the name of the output file (index.js)
                entryFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
            },
        },
    },

    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
});
