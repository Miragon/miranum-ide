module.exports = {
    displayName: "miranum-modeler-webview",
    preset: "../../jest.preset.js",
    transform: {
        "^.+.vue$": "@vue/vue2-jest",
        ".+.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$":
            "jest-transform-stub",
        "^.+.tsx?$": "ts-jest",
    },
    moduleFileExtensions: ["ts", "tsx", "vue", "js", "json"],
    coverageDirectory: "../../coverage/apps/miranum-modeler-webview",
    snapshotSerializers: ["jest-serializer-vue"],
    globals: {
        "ts-jest": {
            tsconfig: "apps/miranum-modeler-webview/tsconfig.spec.json",
        },
        "vue-jest": {
            tsConfig: "apps/miranum-modeler-webview/tsconfig.spec.json",
        },
    },
};
