/// <reference types='vitest' />
import { defineConfig } from "vite";

import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
    root: __dirname,
    cacheDir: "../../node_modules/.vite/apps/miranum-config-editor-webview",

    server: {
        port: 4200,
        host: "localhost",
    },

    preview: {
        port: 4300,
        host: "localhost",
    },

    plugins: [nxViteTsPaths(), vue(), vuetify({ autoImport: true })],

    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },

    build: {
        outDir: "../../dist/apps/miranum-config-editor-webview",
        reportCompressedSize: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },

    test: {
        globals: true,
        cache: {
            dir: "../../node_modules/.vitest",
        },
        environment: "jsdom",
        include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

        reporters: ["default"],
        coverage: {
            reportsDirectory: "../../coverage/apps/miranum-config-editor-webview",
            provider: "v8",
        },
    },
});
