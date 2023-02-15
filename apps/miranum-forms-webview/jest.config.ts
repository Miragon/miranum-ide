module.exports = {
    displayName: "miranum-forms-webview",
    preset: "../../jest.preset.js",
    transform: {
        "^.+.vue$": "@vue/vue2-jest",
        ".+.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$":
            "jest-transform-stub",
        "^.+.tsx?$": "ts-jest",
    },
    moduleFileExtensions: ["ts", "tsx", "vue", "js", "json"],
    coverageDirectory: "../../coverage/apps/miranum-forms-webview",
    snapshotSerializers: ["jest-serializer-vue"],
    globals: {
        "ts-jest": {
            tsconfig: "apps/miranum-forms-webview/tsconfig.spec.json",
        },
        "vue-jest": {
            tsConfig: "apps/miranum-forms-webview/tsconfig.spec.json",
        },
    },
};
