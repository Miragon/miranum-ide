module.exports = {
    displayName: "miranum-config-editor-webview",
    preset: "../../jest.preset.js",
    transform: {
        "^.+.vue$": "@vue/vue2-jest",
        ".+.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$":
            "jest-transform-stub",
        "^.+.tsx?$": [
            "ts-jest",
            {
                tsconfig: "apps/miranum-config-editor-webview/tsconfig.spec.json",
            },
        ],
    },
    moduleFileExtensions: ["ts", "tsx", "vue", "js", "json"],
    coverageDirectory: "../../coverage/apps/miranum-config-editor-webview",
    snapshotSerializers: ["jest-serializer-vue"],
    globals: {
        "vue-jest": {
            tsConfig: "apps/miranum-config-editor-webview/tsconfig.spec.json",
        },
    },
};
