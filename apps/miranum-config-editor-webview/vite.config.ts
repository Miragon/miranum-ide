/// <reference types="vitest" />
import { defineConfig } from "vite";

import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import vue from "@vitejs/plugin-vue2";
import { VuetifyResolver } from "unplugin-vue-components/resolvers";
import Component from "unplugin-vue-components/vite";

export default defineConfig({
    cacheDir: "../../node_modules/.vite/miranum-config-editor-webview",

    server: {
        port: 4200,
        host: "localhost",
    },

    preview: {
        port: 4300,
        host: "localhost",
    },

    plugins: [
        nxViteTsPaths(),
        vue(),
        Component({
            resolvers: [VuetifyResolver()],
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
});
