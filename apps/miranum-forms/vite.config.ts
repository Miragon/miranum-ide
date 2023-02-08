/// <reference types="vitest" />
import { defineConfig } from "vite";
import ViteTsConfigPathsPlugin from "vite-tsconfig-paths";

export default defineConfig({
    build: {
        target: "es2021",
        commonjsOptions: { transformMixedEsModules: true },
        lib: {
            entry: "src/main.ts",
            name: "extension",
            fileName: "extension",
        },
        rollupOptions: {
            external: [
                "vscode",
            ],
        },
    },
    plugins: [
        ViteTsConfigPathsPlugin({
            root: "../../",
        }),
    ],
});
