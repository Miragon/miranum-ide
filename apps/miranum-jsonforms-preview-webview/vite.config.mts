/// <reference types='vitest' />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
    root: __dirname,
    cacheDir: "../../node_modules/.vite/apps/miranum-jsonforms-preview-webview",

    server: {
        port: 4200,
        host: "localhost",
    },

    preview: {
        port: 4300,
        host: "localhost",
    },

    plugins: [vue(), nxViteTsPaths(), vuetify({ autoImport: true })],

    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },

    build: {
        target: "es2021",
        chunkSizeWarningLimit: 1200,
        reportCompressedSize: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                // don't hash the name of the output file (index.js)
                entryFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
            },
        },
    },

    // test: {
    //     globals: true,
    //     environment: "jsdom",
    //     include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

    //     reporters: ["default"],
    //     coverage: {
    //         reportsDirectory: "../../coverage/apps/miranum-jsonforms-preview-webview",
    //         provider: "v8",
    //     },
    //     server: {
    //         deps: {
    //             inline: ["vuetify"],
    //         },
    //     },
    // },

    resolve: {
        mainFields: ["module"],
    },
});
