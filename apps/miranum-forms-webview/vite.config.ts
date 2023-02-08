/// <reference types="vitest" />
import { defineConfig } from "vite";

import viteTsConfigPaths from "vite-tsconfig-paths";
import {createVuePlugin} from "vite-plugin-vue2";
import path from 'path';
import {viteStaticCopy} from 'vite-plugin-static-copy'
import Components from 'unplugin-vue-components/vite'
import {VuetifyResolver} from "unplugin-vue-components/resolvers";

export default defineConfig({
    cacheDir: "../../node_modules/.vite/miranum-forms-webview",

    resolve: {
        alias: [
            {
                find: '@/',
                replacement: `${path.resolve(__dirname, '.')}/`,
            },
        ],
    },
    plugins: [
        createVuePlugin(),
        Components({
            transformer: 'vue2',
            dts: true,
            resolvers: [
                VuetifyResolver()
            ]
        }),
        viteStaticCopy({
            targets: [
                {src: 'node_modules/@mdi/font/css/**', dest: 'assets/css/'},
                {src: 'node_modules/@mdi/font/fonts/**', dest: 'assets/fonts/'}
            ]
        }),
        viteTsConfigPaths({
            root: "../../",
        }),
    ],
    build: {
        target: 'es2021',
        commonjsOptions: {transformMixedEsModules: true},
        lib: {
            entry: 'src/main.ts',
            name: 'webview',
            fileName: 'webview',
        },
        minify: 'esbuild',
    },
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    }
});
