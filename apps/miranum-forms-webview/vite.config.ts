/// <reference types='vitest' />
import { defineConfig } from "vite";

import { createVuePlugin } from "vite-plugin-vue2";
import * as path from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import Components from "unplugin-vue-components/vite";
import { VuetifyResolver } from "unplugin-vue-components/resolvers";

export default defineConfig({
    cacheDir: "../../node_modules/.vite/miranum-forms-webview",

    resolve: {
        alias: [
            {
                find: "@",
                replacement: path.resolve(__dirname, "./src"),
            },
            {
                find: "@miranum-ide/vscode/miranum-vscode-webview",
                replacement: path.resolve(
                    __dirname,
                    "../../libs/vscode/miranum-vscode-webview/src",
                ),
            },
            {
                find: "@miranum-ide/vscode/shared/miranum-forms",
                replacement: path.resolve(
                    __dirname,
                    "../../libs/vscode/shared/miranum-forms/src",
                ),
            },
        ],
    },
    plugins: [
        createVuePlugin(),
        Components({
            transformer: "vue2",
            dts: true,
            resolvers: [VuetifyResolver()],
        }),
        viteStaticCopy({
            targets: [
                { src: "./src/assets/reset.css", dest: "css/" },
                { src: "../../node_modules/@mdi/font/css/**", dest: "css/" },
                { src: "../../node_modules/@mdi/font/fonts/**", dest: "fonts/" },
            ],
        }),
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
});
