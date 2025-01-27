/// <reference types="vitest" />
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
    root: __dirname,
    cacheDir: "../../node_modules/.vite/miranum-modeler-bpmn-webview",

    plugins: [
        nxViteTsPaths(),
        viteStaticCopy({
            targets: [
                {
                    src: "../../node_modules/camunda-bpmn-js/dist/assets/bpmn-font/css/**",
                    dest: "css/",
                },
                {
                    src: "../../node_modules/camunda-bpmn-js/dist/assets/bpmn-font/font/**",
                    dest: "font/",
                },
            ],
        }),
    ],

    build: {
        target: "es2021",
        commonjsOptions: { transformMixedEsModules: true },
        chunkSizeWarningLimit: 1200,
        outDir: "../../dist/apps/miranum-modeler/miranum-modeler-bpmn-webview",
        emptyOutDir: true,
        rollupOptions: {
            output: {
                // don't hash the name of the output file (index.js)
                entryFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
            },
        },
    },

    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
});
