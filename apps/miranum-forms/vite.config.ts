/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
    build: {
        rollupOptions: {
            external: [
                "vscode",
            ],
        },
    },
});
