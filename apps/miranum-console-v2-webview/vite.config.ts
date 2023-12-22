/// <reference types='vitest' />
import { defineConfig } from "vite";
import path from "node:path";

import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import vue from "@vitejs/plugin-vue2";
import { createHtmlPlugin } from "vite-plugin-html";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig(({ command }) => {
    let indexHtml = "index.html";
    if (command === "serve") {
        indexHtml = "index_dev.html";
    }

    return {
        cacheDir: "../../node_modules/.vite/miranum-console-v2-webview",

        resolve: {
            alias: [
                {
                    find: "@",
                    replacement: path.resolve(__dirname, "./src"),
                },
            ],
        },

        server: {
            port: 4200,
            host: "localhost",
            fs: {
                allow: ["../../node_modules/@vscode/codicons/dist"],
            },
        },

        preview: {
            port: 4300,
            host: "localhost",
        },

        plugins: [
            vue(),
            nxViteTsPaths(),
            createHtmlPlugin({ template: indexHtml }),
            viteStaticCopy({
                targets: [
                    {
                        src: "../../node_modules/@vscode/codicons/dist/codicon.css",
                        dest: "codicons/",
                    },
                    {
                        src: "../../node_modules/@vscode/codicons/dist/codicon.ttf",
                        dest: "codicons/",
                    },
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

        test: {
            globals: true,
            cache: {
                dir: "../../node_modules/.vitest",
            },
            environment: "jsdom",
            include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        },
    };
});
