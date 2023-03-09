/// <reference types="vitest" />
import { defineConfig } from "vite";
import path from "path";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    cacheDir: "../../node_modules/.vite/miranum-jsonforms-webview",

    resolve: {
        alias: [
            {
                find: "@",
                replacement: path.resolve(__dirname, "./app"),
            },
        ],
    },

    plugins: [
        vue(),
    ],

    build: {
        target: "es2021",
        commonjsOptions: { transformMixedEsModules: true },
        chunkSizeWarningLimit: 1200,
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

    css: {
        postcss: "src",
    },
});
