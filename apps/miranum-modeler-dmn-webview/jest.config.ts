module.exports = {
    displayName: "miranum-modeler-dmn-webview",
    preset: "../../jest.preset.js",
    transform: {
        "^.+.vue$": "@vue/vue3-jest",
        ".+.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$":
            "jest-transform-stub",
        "^.+.tsx?$": [
            "ts-jest",
            {
                tsconfig: "apps/miranum-modeler-dmn-webview/tsconfig.spec.json",
            },
        ],
    },
    moduleFileExtensions: ["ts", "tsx", "vue", "js", "json"],
    coverageDirectory: "../../coverage/apps/miranum-modeler-dmn-webview",
    snapshotSerializers: ["jest-serializer-vue"],
    globals: {
        "vue-jest": {
            tsConfig: "apps/miranum-modeler-dmn-webview/tsconfig.spec.json",
        },
    },
};
