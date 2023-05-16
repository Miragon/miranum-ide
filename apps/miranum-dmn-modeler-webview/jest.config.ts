module.exports = {
    displayName: "miranum-dmn-modeler-webview",
    preset: "../../jest.preset.js",
    transform: {
        "^.+.vue$": "@vue/vue2-jest",
        ".+.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$":
            "jest-transform-stub",
        "^.+.tsx?$": "ts-jest",
    },
    moduleFileExtensions: ["ts", "tsx", "vue", "js", "json"],
    coverageDirectory: "../../coverage/apps/miranum-dmn-modeler-webview",
    snapshotSerializers: ["jest-serializer-vue"],
    globals: {
        "ts-jest": {
            tsconfig: "apps/miranum-dmn-modeler-webview/tsconfig.spec.json",
        },
        "vue-jest": {
            tsConfig: "apps/miranum-dmn-modeler-webview/tsconfig.spec.json",
        },
    },
};
