/// <reference types="vitest" />
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { resolve } from "path"

export default defineConfig({
    cacheDir: "../../node_modules/.vite/miranum-modeler-dmn-webview",

    plugins: [
        viteTsConfigPaths({ root: "../../" }),
        viteStaticCopy({
            targets: [
                {
                    src: "node_modules/dmn-js/dist/assets/dmn-font/css/**",
                    dest: "css/",
                },
                {
                    src: "node_modules/dmn-js/dist/assets/dmn-font/font/**",
                    dest: "font/",
                },
            ],
        }),
    ],

    build: {
        target: "es2021",
        commonjsOptions: { transformMixedEsModules: true },
        chunkSizeWarningLimit: 1200,
        lib: {
            entry: resolve(__dirname, "src/main.ts"),
            name: "miranum-modeler-dmn-webview",
        },
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
